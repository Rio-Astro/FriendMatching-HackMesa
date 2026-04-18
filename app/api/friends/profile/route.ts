import { NextResponse } from 'next/server';

import { auth, currentUser } from '@clerk/nextjs/server';

import { getCurrentMatchProfileDraft, upsertCurrentMatchProfile } from '@/lib/friends';
import type { MatchProfileDraft, SocialLink, SocialPlatform, SocialVisibility } from '@/lib/types';

const SOCIAL_PLATFORMS = new Set<SocialPlatform>(['instagram', 'linkedin', 'tiktok', 'x']);
const SOCIAL_VISIBILITY = new Set<SocialVisibility>(['public', 'saved_only', 'private']);

function normalizeImageValue(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const isAllowed = trimmed.startsWith('data:image/') || trimmed.startsWith('https://') || trimmed.startsWith('http://');

  if (!isAllowed || trimmed.length > 2_500_000) {
    return null;
  }

  return trimmed;
}

function normalizeSocialLinks(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as SocialLink[];
  }

  const normalized = value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return [];
    }

    const candidate = item as Record<string, unknown>;
    const platform = typeof candidate.platform === 'string' && SOCIAL_PLATFORMS.has(candidate.platform as SocialPlatform)
      ? candidate.platform as SocialPlatform
      : null;
    const visibility = typeof candidate.visibility === 'string' && SOCIAL_VISIBILITY.has(candidate.visibility as SocialVisibility)
      ? candidate.visibility as SocialVisibility
      : 'public';
    const handle = typeof candidate.handle === 'string' ? candidate.handle.trim() : '';

    if (!platform || !handle) {
      return [];
    }

    return [{ platform, handle, visibility, url: '' }];
  });

  return normalized.slice(0, 8);
}

function parseDraft(value: unknown): MatchProfileDraft | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const graduationYearValue = candidate.graduationYear;
  const graduationYear = typeof graduationYearValue === 'number' && Number.isFinite(graduationYearValue)
    ? Math.trunc(graduationYearValue)
    : null;

  const displayName = typeof candidate.displayName === 'string' ? candidate.displayName.trim() : '';
  const major = typeof candidate.major === 'string' ? candidate.major.trim() : '';
  const bio = typeof candidate.bio === 'string' ? candidate.bio.trim() : '';
  const homeState = typeof candidate.homeState === 'string' ? candidate.homeState.trim() : '';
  const avatarUrl = normalizeImageValue(candidate.avatarUrl);
  const coverImageUrl = normalizeImageValue(candidate.coverImageUrl);
  const socialLinks = normalizeSocialLinks(candidate.socialLinks);
  const profileStatus = candidate.profileStatus === 'paused' ? 'paused' : 'active';
  const interests = Array.isArray(candidate.interests)
    ? candidate.interests.filter((item): item is string => typeof item === 'string')
    : [];
  const goals = Array.isArray(candidate.goals)
    ? candidate.goals.filter((item): item is string => typeof item === 'string')
    : [];
  const selectedSchoolIds = Array.isArray(candidate.selectedSchoolIds)
    ? candidate.selectedSchoolIds.filter((item): item is string => typeof item === 'string')
    : [];

  if (!displayName || !major || !bio || !homeState || interests.length === 0 || goals.length === 0) {
    return null;
  }

  return {
    displayName,
    graduationYear,
    major,
    bio,
    homeState,
    avatarUrl,
    coverImageUrl,
    profileStatus,
    socialLinks,
    interests: interests.slice(0, 5),
    goals: goals.slice(0, 3),
    selectedSchoolIds: selectedSchoolIds.slice(0, 3),
  };
}

async function getAuthenticatedUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await currentUser();

  return {
    userId,
    displayName: user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || null,
  };
}

export async function GET() {
  try {
    const sessionUser = await getAuthenticatedUser();

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getCurrentMatchProfileDraft(sessionUser.userId, sessionUser.displayName);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown friends profile read error';
    console.error('Friends profile GET error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getAuthenticatedUser();

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const draft = parseDraft(body.profile);

    if (!draft) {
      return NextResponse.json({ error: 'Complete the required friend profile fields before saving.' }, { status: 400 });
    }

    const result = await upsertCurrentMatchProfile(
      sessionUser.userId,
      sessionUser.displayName,
      draft,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown friends profile save error';
    console.error('Friends profile POST error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
