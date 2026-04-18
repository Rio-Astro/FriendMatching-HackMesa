import { NextResponse } from 'next/server';

import { auth, currentUser } from '@clerk/nextjs/server';

import { ensureUserProfile, getUserState, setSavedSchool } from '@/lib/neon';

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

    return NextResponse.json({ savedSchoolIds: state.savedSchoolIds });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown saved schools error';
    console.error('Saved schools GET error:', error);
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
    const schoolId = typeof body.schoolId === 'string' ? body.schoolId : null;
    const saved = typeof body.saved === 'boolean' ? body.saved : null;

    if (!schoolId || saved === null) {
      return NextResponse.json({ error: 'schoolId and saved are required' }, { status: 400 });
    }

    await ensureUserProfile(sessionUser.userId, { displayName: sessionUser.displayName });
    await setSavedSchool(sessionUser.userId, schoolId, saved);

    return NextResponse.json({ ok: true, schoolId, saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown saved school update error';
    console.error('Saved schools POST error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
