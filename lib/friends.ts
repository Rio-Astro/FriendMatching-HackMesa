import { ensureUserProfile, getSql, getUserState } from '@/lib/neon';
import type { FriendCard, MatchProfile, MatchProfileDraft, QuizAnswers } from '@/lib/types';

type MatchProfileRow = {
  id: string;
  clerk_user_id: string | null;
  display_name: string;
  graduation_year: number | null;
  major: string;
  bio: string;
  home_state: string;
  avatar_type: 'initials' | 'uploaded' | 'demo';
  avatar_url: string | null;
  is_demo: boolean;
  demo_label: 'Demo' | 'AI' | null;
  profile_status: 'active' | 'paused' | 'hidden';
};

type MatchProfileInterestRow = {
  interest: string;
};

type MatchProfileGoalRow = {
  goal: string;
};

type MatchProfileCollegeRow = {
  school_id: string;
  name: string;
  selection_rank: number;
};

type LatestQuizRow = {
  answers_json: unknown;
};

type CompatibilityEdgeRow = {
  candidate_profile_id: string;
  score: number;
  shared_colleges_json: unknown;
  shared_signals_json: unknown;
};

type MatchProfileBundle = {
  profile: MatchProfile;
  quizAnswers: QuizAnswers;
};

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeQuizAnswers(value: unknown): QuizAnswers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value).filter(([, answer]) => typeof answer === 'string');
  return Object.fromEntries(entries) as QuizAnswers;
}

function dedupeStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'ME';
  }

  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
}

function humanizeSharedSignal(signal: string) {
  if (signal.startsWith('interest:')) {
    return signal.slice('interest:'.length);
  }

  if (signal.startsWith('goal:')) {
    return signal.slice('goal:'.length);
  }

  if (signal.startsWith('answer:')) {
    return 'similar quiz vibe';
  }

  if (signal === 'same-home-state') {
    return 'same home state';
  }

  return signal;
}

function buildWhyMatch(sharedColleges: string[], sharedSignals: string[]) {
  const readableSignals = dedupeStrings(sharedSignals.map(humanizeSharedSignal)).filter(Boolean);
  const parts: string[] = [];

  if (sharedColleges.length > 0) {
    parts.push(`You both picked <b>${sharedColleges[0]}</b>`);
  }

  const notableSignals = readableSignals.filter((signal) => signal !== 'similar quiz vibe').slice(0, 2);

  if (notableSignals.length > 0) {
    const formatted = notableSignals.map((signal) => `<b>${signal}</b>`).join(' and ');
    parts.push(`share ${formatted}`);
  }

  if (parts.length === 0 && readableSignals.includes('similar quiz vibe')) {
    return 'Your quiz answers line up in a way that suggests a similar college rhythm.';
  }

  return `${parts.join(', and ')}. That gives you a strong baseline to click quickly.`;
}

async function getMatchProfileRowByClerkUserId(clerkUserId: string) {
  const sql = getSql();
  const rows = (await sql.query(
    `
      select
        id,
        clerk_user_id,
        display_name,
        graduation_year,
        major,
        bio,
        home_state,
        avatar_type,
        avatar_url,
        is_demo,
        demo_label,
        profile_status
      from match_profiles
      where clerk_user_id = $1
      limit 1
    `,
    [clerkUserId],
  )) as MatchProfileRow[];

  return rows[0] || null;
}

async function getMatchProfileBundleById(profileId: string) {
  const sql = getSql();
  const rows = (await sql.query(
    `
      select
        id,
        clerk_user_id,
        display_name,
        graduation_year,
        major,
        bio,
        home_state,
        avatar_type,
        avatar_url,
        is_demo,
        demo_label,
        profile_status
      from match_profiles
      where id = $1
      limit 1
    `,
    [profileId],
  )) as MatchProfileRow[];

  const row = rows[0];

  if (!row) {
    return null;
  }

  return getMatchProfileBundleFromRow(row);
}

async function getMatchProfileBundleFromRow(row: MatchProfileRow): Promise<MatchProfileBundle> {
  const sql = getSql();

  const [interestRows, goalRows, collegeRows, quizRows] = await Promise.all([
    sql.query(
      `
        select interest
        from match_profile_interests
        where profile_id = $1
        order by interest asc
      `,
      [row.id],
    ) as unknown as Promise<MatchProfileInterestRow[]>,
    sql.query(
      `
        select goal
        from match_profile_goals
        where profile_id = $1
        order by goal asc
      `,
      [row.id],
    ) as unknown as Promise<MatchProfileGoalRow[]>,
    sql.query(
      `
        select mpc.school_id, s.name, mpc.selection_rank
        from match_profile_colleges mpc
        join schools s on s.id = mpc.school_id
        where mpc.profile_id = $1
        order by mpc.selection_rank asc, s.name asc
      `,
      [row.id],
    ) as unknown as Promise<MatchProfileCollegeRow[]>,
    row.clerk_user_id
      ? (sql.query(
          `
            select answers_json
            from quiz_results
            where clerk_user_id = $1
            order by created_at desc
            limit 1
          `,
          [row.clerk_user_id],
        ) as unknown as Promise<LatestQuizRow[]>)
      : Promise.resolve([] as LatestQuizRow[]),
  ]);

  return {
    profile: {
      id: row.id,
      clerkUserId: row.clerk_user_id,
      displayName: row.display_name,
      graduationYear: row.graduation_year,
      major: row.major,
      bio: row.bio,
      homeState: row.home_state,
      avatarType: row.avatar_type,
      avatarUrl: row.avatar_url,
      isDemo: row.is_demo,
      demoLabel: row.demo_label,
      profileStatus: row.profile_status,
      interests: interestRows.map((item) => item.interest),
      goals: goalRows.map((item) => item.goal),
      selectedSchoolIds: collegeRows.map((item) => item.school_id),
      selectedSchools: collegeRows.map((item) => item.name),
    },
    quizAnswers: normalizeQuizAnswers(quizRows[0]?.answers_json),
  };
}

function buildDraftFromBundle(bundle: MatchProfileBundle): MatchProfileDraft {
  return {
    displayName: bundle.profile.displayName,
    graduationYear: bundle.profile.graduationYear,
    major: bundle.profile.major,
    bio: bundle.profile.bio,
    homeState: bundle.profile.homeState,
    profileStatus: bundle.profile.profileStatus === 'paused' ? 'paused' : 'active',
    interests: bundle.profile.interests,
    goals: bundle.profile.goals,
    selectedSchoolIds: bundle.profile.selectedSchoolIds,
  };
}

export async function getCurrentMatchProfileDraft(clerkUserId: string, fallbackDisplayName: string | null) {
  const row = await getMatchProfileRowByClerkUserId(clerkUserId);

  if (row) {
    const bundle = await getMatchProfileBundleFromRow(row);
    return {
      profile: buildDraftFromBundle(bundle),
      exists: true,
    };
  }

  const userState = await getUserState(clerkUserId);

  return {
    profile: {
      displayName: fallbackDisplayName || '',
      graduationYear: null,
      major: '',
      bio: '',
      homeState: '',
      profileStatus: 'active',
      interests: [],
      goals: [],
      selectedSchoolIds: userState.selectedSchoolIds,
    },
    exists: false,
  };
}

function intersect(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

function buildCompatibilityEdge(viewer: MatchProfileBundle, candidate: MatchProfileBundle) {
  const sharedColleges = intersect(viewer.profile.selectedSchools, candidate.profile.selectedSchools);
  const sharedInterests = intersect(viewer.profile.interests, candidate.profile.interests);
  const sharedGoals = intersect(viewer.profile.goals, candidate.profile.goals);
  const answerOverlapCount = Object.keys(viewer.quizAnswers).filter((key) => {
    const answerKey = key as keyof QuizAnswers;
    return viewer.quizAnswers[answerKey] && viewer.quizAnswers[answerKey] === candidate.quizAnswers[answerKey];
  }).length;
  const sameHomeState = Boolean(viewer.profile.homeState) && viewer.profile.homeState === candidate.profile.homeState;
  const fallbackSignalCount = sharedInterests.length + sharedGoals.length + answerOverlapCount;
  const hasSharedColleges = sharedColleges.length > 0;

  if (!hasSharedColleges && !(sameHomeState && fallbackSignalCount >= 3)) {
    return null;
  }

  let score = hasSharedColleges ? 58 : 44;
  score += sharedColleges.length * 16;
  score += sharedInterests.length * 6;
  score += sharedGoals.length * 6;
  score += answerOverlapCount * 3;

  if (sameHomeState) {
    score += 5;
  }

  if (viewer.profile.major && candidate.profile.major && viewer.profile.major === candidate.profile.major) {
    score += 4;
  }

  const sharedSignals = [
    ...sharedInterests.map((value) => `interest:${value}`),
    ...sharedGoals.map((value) => `goal:${value}`),
    ...Array.from({ length: answerOverlapCount }, (_, index) => `answer:${index + 1}`),
    ...(sameHomeState ? ['same-home-state'] : []),
  ];

  return {
    score: Math.min(99, score),
    sharedColleges,
    sharedSignals,
  };
}

async function upsertCompatibilityEdge(viewerProfileId: string, candidateProfileId: string, score: number, sharedColleges: string[], sharedSignals: string[]) {
  const sql = getSql();

  await sql.query(
    `
      insert into compatibility_edges (
        viewer_profile_id,
        candidate_profile_id,
        score,
        shared_colleges_json,
        shared_signals_json,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4::jsonb, $5::jsonb, now(), now())
      on conflict (viewer_profile_id, candidate_profile_id) do update
      set score = excluded.score,
          shared_colleges_json = excluded.shared_colleges_json,
          shared_signals_json = excluded.shared_signals_json,
          updated_at = now()
    `,
    [viewerProfileId, candidateProfileId, score, JSON.stringify(sharedColleges), JSON.stringify(sharedSignals)],
  );
}

export async function recomputeCompatibilityForClerkUser(clerkUserId: string) {
  const sql = getSql();
  const row = await getMatchProfileRowByClerkUserId(clerkUserId);

  if (!row) {
    return { profile: null, items: [] as FriendCard[] };
  }

  await sql.query(
    `
      delete from compatibility_edges
      where viewer_profile_id = $1
         or candidate_profile_id = $1
    `,
    [row.id],
  );

  const viewerBundle = await getMatchProfileBundleFromRow(row);

  if (viewerBundle.profile.profileStatus !== 'active') {
    return { profile: buildDraftFromBundle(viewerBundle), items: [] as FriendCard[] };
  }

  const candidateRows = (await sql.query(
    `
      select
        id,
        clerk_user_id,
        display_name,
        graduation_year,
        major,
        bio,
        home_state,
        avatar_type,
        avatar_url,
        is_demo,
        demo_label,
        profile_status
      from match_profiles
      where id <> $1
        and profile_status = 'active'
      order by created_at asc
    `,
    [row.id],
  )) as MatchProfileRow[];

  for (const candidateRow of candidateRows) {
    const candidateBundle = await getMatchProfileBundleFromRow(candidateRow);
    const viewerEdge = buildCompatibilityEdge(viewerBundle, candidateBundle);
    const candidateEdge = buildCompatibilityEdge(candidateBundle, viewerBundle);

    if (viewerEdge) {
      await upsertCompatibilityEdge(viewerBundle.profile.id, candidateBundle.profile.id, viewerEdge.score, viewerEdge.sharedColleges, viewerEdge.sharedSignals);
    }

    if (candidateEdge) {
      await upsertCompatibilityEdge(candidateBundle.profile.id, viewerBundle.profile.id, candidateEdge.score, candidateEdge.sharedColleges, candidateEdge.sharedSignals);
    }
  }

  return {
    profile: buildDraftFromBundle(viewerBundle),
    items: await getFriendFeedForClerkUser(clerkUserId),
  };
}

export async function upsertCurrentMatchProfile(
  clerkUserId: string,
  fallbackDisplayName: string | null,
  avatarUrl: string | null,
  input: MatchProfileDraft,
) {
  const sql = getSql();
  const selectedSchoolIds = dedupeStrings(input.selectedSchoolIds).slice(0, 3);

  await ensureUserProfile(clerkUserId, { displayName: input.displayName || fallbackDisplayName || null });

  const rows = (await sql.query(
    `
      insert into match_profiles (
        clerk_user_id,
        display_name,
        graduation_year,
        major,
        bio,
        home_state,
        avatar_type,
        avatar_url,
        is_demo,
        profile_status,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, 'initials', $7, false, $8, now())
      on conflict (clerk_user_id) do update
      set display_name = excluded.display_name,
          graduation_year = excluded.graduation_year,
          major = excluded.major,
          bio = excluded.bio,
          home_state = excluded.home_state,
          avatar_url = coalesce(excluded.avatar_url, match_profiles.avatar_url),
          profile_status = excluded.profile_status,
          updated_at = now()
      returning id
    `,
    [
      clerkUserId,
      input.displayName || fallbackDisplayName || 'Mesa User',
      input.graduationYear,
      input.major,
      input.bio,
      input.homeState,
      avatarUrl,
      input.profileStatus,
    ],
  )) as Array<{ id: string }>;

  const profileId = rows[0]?.id;

  if (!profileId) {
    throw new Error('Could not save match profile');
  }

  await Promise.all([
    sql.query('delete from match_profile_interests where profile_id = $1', [profileId]),
    sql.query('delete from match_profile_goals where profile_id = $1', [profileId]),
    sql.query('delete from match_profile_colleges where profile_id = $1', [profileId]),
  ]);

  for (const interest of dedupeStrings(input.interests).slice(0, 5)) {
    await sql.query(
      `
        insert into match_profile_interests (profile_id, interest)
        values ($1, $2)
      `,
      [profileId, interest],
    );
  }

  for (const goal of dedupeStrings(input.goals).slice(0, 3)) {
    await sql.query(
      `
        insert into match_profile_goals (profile_id, goal)
        values ($1, $2)
      `,
      [profileId, goal],
    );
  }

  for (const [index, schoolId] of selectedSchoolIds.entries()) {
    await sql.query(
      `
        insert into match_profile_colleges (profile_id, school_id, selection_rank)
        values ($1, $2, $3)
      `,
      [profileId, schoolId, index + 1],
    );
  }

  return recomputeCompatibilityForClerkUser(clerkUserId);
}

export async function getFriendFeedForClerkUser(clerkUserId: string) {
  const sql = getSql();
  const row = await getMatchProfileRowByClerkUserId(clerkUserId);

  if (!row) {
    return [] as FriendCard[];
  }

  const edgeRows = (await sql.query(
    `
      select candidate_profile_id, score, shared_colleges_json, shared_signals_json
      from compatibility_edges
      where viewer_profile_id = $1
      order by score desc, candidate_profile_id asc
      limit 10
    `,
    [row.id],
  )) as CompatibilityEdgeRow[];

  const items: FriendCard[] = [];

  for (const edgeRow of edgeRows) {
    const candidateBundle = await getMatchProfileBundleById(edgeRow.candidate_profile_id);

    if (!candidateBundle) {
      continue;
    }

    const sharedColleges = normalizeStringArray(edgeRow.shared_colleges_json);
    const sharedSignals = normalizeStringArray(edgeRow.shared_signals_json);
    const selectedSchools = candidateBundle.profile.selectedSchools;

    items.push({
      id: candidateBundle.profile.id,
      name: candidateBundle.profile.displayName,
      graduationYear: candidateBundle.profile.graduationYear,
      major: candidateBundle.profile.major,
      initials: buildInitials(candidateBundle.profile.displayName),
      avatarUrl: candidateBundle.profile.avatarUrl,
      school: selectedSchools[0] || candidateBundle.profile.major || 'No school selected yet',
      origin: candidateBundle.profile.homeState ? `from ${candidateBundle.profile.homeState}` : 'from somewhere new',
      bio: candidateBundle.profile.bio,
      interests: candidateBundle.profile.interests,
      goals: candidateBundle.profile.goals,
      compat: edgeRow.score,
      shared: dedupeStrings([...sharedColleges, ...sharedSignals.map(humanizeSharedSignal)]).slice(0, 4),
      reason: buildWhyMatch(sharedColleges, sharedSignals),
      selectedSchools,
      tone: 'sage',
    });
  }

  return items;
}
