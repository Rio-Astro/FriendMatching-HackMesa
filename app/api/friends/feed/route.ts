import { NextResponse } from 'next/server';

import { auth } from '@clerk/nextjs/server';

import { getFriendFeedForClerkUser } from '@/lib/friends';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await getFriendFeedForClerkUser(userId);
    return NextResponse.json({ items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown friends feed error';
    console.error('Friends feed GET error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
