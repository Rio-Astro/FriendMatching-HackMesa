import { NextResponse } from 'next/server';

import { auth, currentUser } from '@clerk/nextjs/server';

import { getCurrentMatchProfileDraft, upsertCurrentMatchProfile } from '@/lib/friends';
import type { MatchProfileDraft } from '@/lib/types';

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
    profileStatus,
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
    avatarUrl: user?.imageUrl || null,
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
      sessionUser.avatarUrl,
      draft,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown friends profile save error';
    console.error('Friends profile POST error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
