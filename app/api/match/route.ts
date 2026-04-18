import { NextResponse } from 'next/server';

import { getActiveSchools } from '@/lib/neon';
import type { MatchedSchool, QuizAnswers } from '@/lib/types';

type MatchRequestBody = {
  answers: QuizAnswers;
};

function matchesSelectedState(location: string, selectedStates: string[]) {
  if (selectedStates.length === 0 || selectedStates.includes('Any')) {
    return true;
  }

  return selectedStates.some((state) => location.endsWith(state));
}

export async function POST(request: Request) {
  try {
    const { answers } = (await request.json()) as MatchRequestBody;
    const collegesData = await getActiveSchools();
    const selectedStates = Array.isArray(answers.q9)
      ? answers.q9
      : answers.q9
        ? [answers.q9]
        : [];

    // Programmatic matching algorithm
    // 1. Filter by location if specified
    const filteredColleges = collegesData.filter((c) => matchesSelectedState(c.state, selectedStates));

    // We assign points to each college based on user properties
    const matches: MatchedSchool[] = filteredColleges.map((c) => {
      let score = 50; // base score

      // Scale (q2): A: small, B: mid, C: large, D: very large
      if (answers.q2 === 'A' && c.size.includes('Small')) score += 15;
      if (answers.q2 === 'B' && c.size.includes('Mid')) score += 15;
      if (answers.q2 === 'C' && c.size.includes('Large') && !c.size.includes('Very')) score += 15;
      if (answers.q2 === 'D' && c.size.includes('Very Large')) score += 15;

      // Budget (q4): A: Very important (low/mid), B: kinda, C/D: NA
      if (answers.q4 === 'A' && c.band === 'low') score += 12;
      if (answers.q4 === 'A' && c.band === 'mid') score += 6;
      if (answers.q4 === 'B' && (c.band === 'low' || c.band === 'mid')) score += 8;

      // Vibe (q5): A: intellectual, B: creative, C: outdoorsy, D: spirited
      if (answers.q5 === 'A' && c.tags.includes('intellectual')) score += 12;
      if (answers.q5 === 'B' && (c.tags.includes('creative') || c.tags.includes('arts-forward'))) score += 12;
      if (answers.q5 === 'C' && (c.tags.includes('nature') || c.tags.includes('outdoorsy') || c.tags.includes('lake') || c.tags.includes('coastal'))) score += 12;
      if (answers.q5 === 'D' && c.tags.includes('spirited')) score += 12;

      // Location (q3): A: town, B: near city, C: city, D: nature
      if (answers.q3 === 'A' && c.tags.includes('college-town')) score += 8;
      if (answers.q3 === 'C' && c.tags.includes('urban')) score += 8;
      if (answers.q3 === 'D' && (c.tags.includes('rural') || c.tags.includes('nature'))) score += 8;

      // General tags match
      ['intellectual', 'tech', 'creative', 'spirited', 'nature', 'urban', 'historic', 'close-knit', 'writing'].forEach((t) => {
        if (c.tags.includes(t)) {
          score += 2;
        }
      });

      // Cap at 99 and keep scoring deterministic for a given answer set.
      score = Math.min(99, score);

      return {
        ...c,
        score,
        why: c.bio
      };
    });

    // Sort deterministically so the same answers always return the same ranking.
    matches.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.name.localeCompare(b.name);
    });

    // Return a larger deterministic set so the results screen can filter/search beyond the top 8.
    return NextResponse.json(matches.slice(0, 100));

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown match error';
    console.error('Match error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
