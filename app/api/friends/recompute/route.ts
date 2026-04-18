import { NextResponse } from 'next/server';

import { auth } from '@clerk/nextjs/server';

import { recomputeCompatibilityForClerkUser } from '@/lib/friends';

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await recomputeCompatibilityForClerkUser(userId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown friends recompute error';
    console.error('Friends recompute POST error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
