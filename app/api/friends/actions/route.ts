import { NextResponse } from 'next/server';

import { auth } from '@clerk/nextjs/server';

import { applyFriendActionForClerkUser } from '@/lib/friends';
import type { FriendActionType } from '@/lib/types';

function parseActionType(value: unknown): FriendActionType | null {
  return value === 'save' || value === 'hide' || value === 'block' || value === 'report' ? value : null;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const targetProfileId = typeof body.targetProfileId === 'string' ? body.targetProfileId : null;
    const actionType = parseActionType(body.actionType);
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;

    if (!targetProfileId || !actionType) {
      return NextResponse.json({ error: 'targetProfileId and actionType are required' }, { status: 400 });
    }

    const result = await applyFriendActionForClerkUser(userId, targetProfileId, actionType, isActive);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown friend action error';
    console.error('Friend action POST error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
