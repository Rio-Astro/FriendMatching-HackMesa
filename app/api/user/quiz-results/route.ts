import { NextResponse } from 'next/server';

import { auth, currentUser } from '@clerk/nextjs/server';

import { ensureUserProfile, saveQuizResult } from '@/lib/neon';
import type { QuizAnswers } from '@/lib/types';

function parseQuizAnswers(value: unknown): QuizAnswers | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value).filter(([, answer]) => typeof answer === 'string');
  return Object.fromEntries(entries) as QuizAnswers;
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

export async function POST(request: Request) {
  try {
    const sessionUser = await getAuthenticatedUser();

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const answers = parseQuizAnswers(body.answers);

    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json({ error: 'answers are required' }, { status: 400 });
    }

    await ensureUserProfile(sessionUser.userId, { displayName: sessionUser.displayName });
    await saveQuizResult(sessionUser.userId, answers, body.topMatchesJson);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown quiz result save error';
    console.error('Quiz results POST error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
