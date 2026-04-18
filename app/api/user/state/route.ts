import { NextResponse } from 'next/server';

import { auth, currentUser } from '@clerk/nextjs/server';

import { ensureUserProfile, getUserState, setSelectedSchoolIds } from '@/lib/neon';

function parseSelectedSchoolIds(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const selectedSchoolIds = value.filter((item): item is string => typeof item === 'string').slice(0, 3);
  return selectedSchoolIds;
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

    await ensureUserProfile(sessionUser.userId, { displayName: sessionUser.displayName });

    const state = await getUserState(sessionUser.userId);
    return NextResponse.json(state);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown user state error';
    console.error('User state GET error:', error);
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
    const selectedSchoolIds = parseSelectedSchoolIds(body.selectedSchoolIds);

    if (!selectedSchoolIds) {
      return NextResponse.json({ error: 'selectedSchoolIds must be an array of strings' }, { status: 400 });
    }

    await ensureUserProfile(sessionUser.userId, { displayName: sessionUser.displayName });
    await setSelectedSchoolIds(sessionUser.userId, selectedSchoolIds);

    return NextResponse.json({ ok: true, selectedSchoolIds });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown user state save error';
    console.error('User state POST error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
