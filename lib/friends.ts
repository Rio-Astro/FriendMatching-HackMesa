import { ensureUserProfile, getSql, getUserState } from '@/lib/neon';
import type { FriendActionType, FriendCard, FriendFeedResult, MatchProfile, MatchProfileDraft, QuizAnswers } from '@/lib/types';

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
  avatar_emoji: string | null;
  cover_image_url: string | null;
  is_demo: boolean;
  demo_label: 'Demo' | 'AI' | null;
  profile_status: 'active' | 'paused' | 'hidden';
};

type MatchProfileInterestRow = {
  profile_id: string;
  interest: string;
};

type MatchProfileGoalRow = {
  profile_id: string;
  goal: string;
};

type MatchProfileCollegeRow = {
  profile_id: string;
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

type FriendActionRow = {
  target_profile_id: string;
};

type MatchProfileBundle = {
  profile: MatchProfile & {
    avatarEmoji?: string | null;
    coverImageUrl?: string | null;
  };
  quizAnswers: QuizAnswers;
};

const FEED_TARGET_SIZE = 8;

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

function buildWhyMatch(sharedColleges: string[], sharedSignals: string[], isDemo = false) {
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
    return isDemo
      ? 'This demo profile lines up with your quiz answers and helps keep your feed populated while more real students join.'
      : 'Your quiz answers line up in a way that suggests a similar college rhythm.';
  }

  if (parts.length === 0) {
    return isDemo
      ? 'This demo profile overlaps enough with your vibe to keep the feed useful while real matches are still sparse.'
      : 'There is enough overlap here to make this a plausible connection.';
  }

  return `${parts.join(', and ')}. That gives you a strong baseline to click quickly.`;
}

function intersect(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
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
        avatar_emoji,
        cover_image_url,
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
  const bundlesById = await getMatchProfileBundlesByIds([profileId], false);
  return bundlesById.get(profileId) || null;
}

function mapRowsByProfileId<T extends { profile_id: string }>(rows: T[]) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const profileId = row.profile_id;

    if (!grouped.has(profileId)) {
      grouped.set(profileId, []);
    }

    const bucket = grouped.get(profileId);

    if (bucket) {
      bucket.push(row);
    }
  }

  return grouped;
}

async function getMatchProfileBundlesByIds(profileIds: string[], includeQuizAnswers = false) {
  const dedupedIds = [...new Set(profileIds.filter(Boolean))];

  if (dedupedIds.length === 0) {
    return new Map<string, MatchProfileBundle>();
  }

  const sql = getSql();
  const profileRows = (await sql.query(
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
        avatar_emoji,
        cover_image_url,
        is_demo,
        demo_label,
        profile_status
      from match_profiles
      where id = any($1)
    `,
    [dedupedIds],
  )) as MatchProfileRow[];

  if (profileRows.length === 0) {
    return new Map<string, MatchProfileBundle>();
  }

  const [interestRows, goalRows, collegeRows, quizRows] = await Promise.all([
    sql.query(
      `
        select profile_id, interest
        from match_profile_interests
        where profile_id = any($1)
        order by interest asc
      `,
      [dedupedIds],
    ) as unknown as Promise<MatchProfileInterestRow[]>,
    sql.query(
      `
        select profile_id, goal
        from match_profile_goals
        where profile_id = any($1)
        order by goal asc
      `,
      [dedupedIds],
    ) as unknown as Promise<MatchProfileGoalRow[]>,
    sql.query(
      `
        select mpc.profile_id, mpc.school_id, s.name, mpc.selection_rank
        from match_profile_colleges mpc
        join schools s on s.id = mpc.school_id
        where mpc.profile_id = any($1)
        order by mpc.selection_rank asc, s.name asc
      `,
      [dedupedIds],
    ) as unknown as Promise<MatchProfileCollegeRow[]>,
    includeQuizAnswers
      ? Promise.all(profileRows.map(async (row) => {
          if (!row.clerk_user_id) {
            return { profileId: row.id, answers_json: {} };
          }

          const rows = (await sql.query(
            `
              select answers_json
              from quiz_results
              where clerk_user_id = $1
              order by created_at desc
              limit 1
            `,
            [row.clerk_user_id],
          )) as LatestQuizRow[];

          return { profileId: row.id, answers_json: rows[0]?.answers_json };
        }))
      : Promise.resolve([]),
  ]);

  const interestsByProfileId = mapRowsByProfileId(interestRows);
  const goalsByProfileId = mapRowsByProfileId(goalRows);
  const collegesByProfileId = mapRowsByProfileId(collegeRows);
  const quizByProfileId = new Map(quizRows.map((row) => [row.profileId, row.answers_json]));

  return new Map(profileRows.map((row) => {
    const profileInterests = interestsByProfileId.get(row.id) || [];
    const profileGoals = goalsByProfileId.get(row.id) || [];
    const profileColleges = collegesByProfileId.get(row.id) || [];

    return [
      row.id,
      {
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
          avatarEmoji: row.avatar_emoji,
          coverImageUrl: row.cover_image_url,
          isDemo: row.is_demo,
          demoLabel: row.demo_label,
          profileStatus: row.profile_status,
          interests: profileInterests.map((item) => item.interest),
          goals: profileGoals.map((item) => item.goal),
          selectedSchoolIds: profileColleges.map((item) => item.school_id),
          selectedSchools: profileColleges.map((item) => item.name),
        },
        quizAnswers: normalizeQuizAnswers(quizByProfileId.get(row.id)),
      },
    ];
  }));
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
      avatarEmoji: row.avatar_emoji,
      coverImageUrl: row.cover_image_url,
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
    avatarUrl: bundle.profile.avatarUrl || null,
    coverImageUrl: bundle.profile.coverImageUrl || null,
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
      avatarUrl: null,
      coverImageUrl: null,
      profileStatus: 'active',
      interests: [],
      goals: [],
      selectedSchoolIds: userState.selectedSchoolIds,
    },
    exists: false,
  };
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

function buildBackfillCompatibilityEdge(viewer: MatchProfileBundle, candidate: MatchProfileBundle) {
  if (!candidate.profile.isDemo) {
    return null;
  }

  const sharedInterests = intersect(viewer.profile.interests, candidate.profile.interests);
  const sharedGoals = intersect(viewer.profile.goals, candidate.profile.goals);
  const answerOverlapCount = Object.keys(viewer.quizAnswers).filter((key) => {
    const answerKey = key as keyof QuizAnswers;
    return viewer.quizAnswers[answerKey] && viewer.quizAnswers[answerKey] === candidate.quizAnswers[answerKey];
  }).length;
  const sameHomeState = Boolean(viewer.profile.homeState) && viewer.profile.homeState === candidate.profile.homeState;
  const sharedSignals = [
    ...sharedInterests.map((value) => `interest:${value}`),
    ...sharedGoals.map((value) => `goal:${value}`),
    ...Array.from({ length: answerOverlapCount }, (_, index) => `answer:${index + 1}`),
    ...(sameHomeState ? ['same-home-state'] : []),
  ];
  const signalStrength = sharedInterests.length + sharedGoals.length + answerOverlapCount + (sameHomeState ? 1 : 0);

  if (signalStrength < 2) {
    return null;
  }

  let score = 49;
  score += sharedInterests.length * 7;
  score += sharedGoals.length * 7;
  score += answerOverlapCount * 4;

  if (sameHomeState) {
    score += 5;
  }

  return {
    score: Math.min(87, score),
    sharedColleges: [],
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

async function getActionTargetIds(viewerProfileId: string, actionTypes: FriendActionType[]) {
  const sql = getSql();
  const rows = (await sql.query(
    `
      select target_profile_id
      from friend_actions
      where viewer_profile_id = $1
        and action_type = any($2)
        and is_active = true
    `,
    [viewerProfileId, actionTypes],
  )) as FriendActionRow[];

  return rows.map((row) => row.target_profile_id);
}

function buildFriendCard(candidateBundle: MatchProfileBundle, score: number, sharedColleges: string[], sharedSignals: string[]): FriendCard {
  const selectedSchools = candidateBundle.profile.selectedSchools;

  return {
    id: candidateBundle.profile.id,
    name: candidateBundle.profile.displayName,
    graduationYear: candidateBundle.profile.graduationYear,
    major: candidateBundle.profile.major,
    initials: buildInitials(candidateBundle.profile.displayName),
    avatarEmoji: candidateBundle.profile.avatarEmoji || undefined,
    avatarUrl: candidateBundle.profile.avatarUrl,
    coverImageUrl: candidateBundle.profile.coverImageUrl || null,
    isDemo: candidateBundle.profile.isDemo,
    demoLabel: candidateBundle.profile.demoLabel,
    school: selectedSchools[0] || candidateBundle.profile.major || 'No school selected yet',
    origin: candidateBundle.profile.homeState ? `from ${candidateBundle.profile.homeState}` : 'from somewhere new',
    bio: candidateBundle.profile.bio,
    interests: candidateBundle.profile.interests,
    goals: candidateBundle.profile.goals,
    compat: score,
    shared: dedupeStrings([...sharedColleges, ...sharedSignals.map(humanizeSharedSignal)]).slice(0, 4),
    reason: buildWhyMatch(sharedColleges, sharedSignals, Boolean(candidateBundle.profile.isDemo)),
    selectedSchools,
    tone: candidateBundle.profile.demoLabel === 'AI' ? 'sand' : 'sage',
  };
}

async function appendDemoBackfillItems(viewerBundle: MatchProfileBundle, viewerProfileId: string, existingIds: Set<string>, hiddenOrBlockedIds: Set<string>) {
  const sql = getSql();
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
        avatar_emoji,
        cover_image_url,
        is_demo,
        demo_label,
        profile_status
      from match_profiles
      where id <> $1
        and is_demo = true
        and profile_status = 'active'
      order by created_at asc
    `,
    [viewerProfileId],
  )) as MatchProfileRow[];

  const candidateBundlesById = await getMatchProfileBundlesByIds(candidateRows.map((row) => row.id), false);

  const scored: Array<{ score: number; candidateBundle: MatchProfileBundle; sharedColleges: string[]; sharedSignals: string[] }> = [];

  for (const candidateRow of candidateRows) {
    if (existingIds.has(candidateRow.id) || hiddenOrBlockedIds.has(candidateRow.id)) {
      continue;
    }

    const candidateBundle = candidateBundlesById.get(candidateRow.id);

    if (!candidateBundle) {
      continue;
    }

    const edge = buildCompatibilityEdge(viewerBundle, candidateBundle) || buildBackfillCompatibilityEdge(viewerBundle, candidateBundle);

    if (!edge) {
      continue;
    }

    scored.push({
      score: edge.score,
      candidateBundle,
      sharedColleges: edge.sharedColleges,
      sharedSignals: edge.sharedSignals,
    });
  }

  scored.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.candidateBundle.profile.displayName.localeCompare(right.candidateBundle.profile.displayName);
  });

  return scored.slice(0, Math.max(0, FEED_TARGET_SIZE - existingIds.size)).map((item) => {
    existingIds.add(item.candidateBundle.profile.id);
    return buildFriendCard(item.candidateBundle, item.score, item.sharedColleges, item.sharedSignals);
  });
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
        avatar_emoji,
        cover_image_url,
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

  const feed = await getFriendFeedForClerkUser(clerkUserId);

  return {
    profile: buildDraftFromBundle(viewerBundle),
    items: feed.items,
    savedProfileIds: feed.savedProfileIds,
  };
}

export async function upsertCurrentMatchProfile(
  clerkUserId: string,
  fallbackDisplayName: string | null,
  input: MatchProfileDraft,
) {
  const sql = getSql();
  const selectedSchoolIds = dedupeStrings(input.selectedSchoolIds).slice(0, 3);
  const avatarType = input.avatarUrl ? 'uploaded' : 'initials';

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
        cover_image_url,
        is_demo,
        profile_status,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, now())
      on conflict (clerk_user_id) do update
      set display_name = excluded.display_name,
          graduation_year = excluded.graduation_year,
          major = excluded.major,
          bio = excluded.bio,
          home_state = excluded.home_state,
          avatar_type = excluded.avatar_type,
          avatar_url = excluded.avatar_url,
          cover_image_url = excluded.cover_image_url,
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
      avatarType,
      input.avatarUrl || null,
      input.coverImageUrl || null,
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

export async function getFriendFeedForClerkUser(clerkUserId: string): Promise<FriendFeedResult> {
  const sql = getSql();
  const row = await getMatchProfileRowByClerkUserId(clerkUserId);

  if (!row) {
    return { items: [], savedProfileIds: [] };
  }

  const viewerBundle = await getMatchProfileBundleFromRow(row);
  const [savedProfileIds, hiddenTargetIds, blockedTargetIds] = await Promise.all([
    getActionTargetIds(row.id, ['save']),
    getActionTargetIds(row.id, ['hide']),
    getActionTargetIds(row.id, ['block']),
  ]);
  const hiddenOrBlockedIds = new Set([...hiddenTargetIds, ...blockedTargetIds]);

  const edgeRows = (await sql.query(
    `
      select candidate_profile_id, score, shared_colleges_json, shared_signals_json
      from compatibility_edges
      where viewer_profile_id = $1
      order by score desc, candidate_profile_id asc
      limit 24
    `,
    [row.id],
  )) as CompatibilityEdgeRow[];

  const items: FriendCard[] = [];
  const existingIds = new Set<string>();
  const candidateBundlesById = await getMatchProfileBundlesByIds(edgeRows.map((row) => row.candidate_profile_id), false);

  for (const edgeRow of edgeRows) {
    if (hiddenOrBlockedIds.has(edgeRow.candidate_profile_id) || existingIds.has(edgeRow.candidate_profile_id)) {
      continue;
    }

    const candidateBundle = candidateBundlesById.get(edgeRow.candidate_profile_id);

    if (!candidateBundle || candidateBundle.profile.profileStatus !== 'active') {
      continue;
    }

    const sharedColleges = normalizeStringArray(edgeRow.shared_colleges_json);
    const sharedSignals = normalizeStringArray(edgeRow.shared_signals_json);
    items.push(buildFriendCard(candidateBundle, edgeRow.score, sharedColleges, sharedSignals));
    existingIds.add(edgeRow.candidate_profile_id);

    if (items.length >= FEED_TARGET_SIZE) {
      break;
    }
  }

  if (items.length < FEED_TARGET_SIZE) {
    const demoBackfillItems = await appendDemoBackfillItems(viewerBundle, row.id, existingIds, hiddenOrBlockedIds);
    items.push(...demoBackfillItems.slice(0, FEED_TARGET_SIZE - items.length));
  }

  return {
    items,
    savedProfileIds,
  };
}

export async function applyFriendActionForClerkUser(
  clerkUserId: string,
  targetProfileId: string,
  actionType: FriendActionType,
  isActive: boolean,
) {
  const sql = getSql();
  const row = await getMatchProfileRowByClerkUserId(clerkUserId);

  if (!row) {
    throw new Error('Create your friend profile before managing people in the network.');
  }

  const targetRows = (await sql.query(
    `
      select id
      from match_profiles
      where id = $1
      limit 1
    `,
    [targetProfileId],
  )) as Array<{ id: string }>;

  if (!targetRows[0]) {
    throw new Error('Target profile not found.');
  }

  await sql.query(
    `
      insert into friend_actions (
        viewer_profile_id,
        target_profile_id,
        action_type,
        is_active,
        updated_at
      )
      values ($1, $2, $3, $4, now())
      on conflict (viewer_profile_id, target_profile_id, action_type) do update
      set is_active = excluded.is_active,
          updated_at = now()
    `,
    [row.id, targetProfileId, actionType, isActive],
  );

  if ((actionType === 'hide' || actionType === 'block' || actionType === 'report') && isActive) {
    await sql.query(
      `
        insert into friend_actions (
          viewer_profile_id,
          target_profile_id,
          action_type,
          is_active,
          updated_at
        )
        values ($1, $2, 'save', false, now())
        on conflict (viewer_profile_id, target_profile_id, action_type) do update
        set is_active = false,
            updated_at = now()
      `,
      [row.id, targetProfileId],
    );
  }

  if ((actionType === 'block' || actionType === 'report') && isActive) {
    await sql.query(
      `
        insert into friend_actions (
          viewer_profile_id,
          target_profile_id,
          action_type,
          is_active,
          updated_at
        )
        values ($1, $2, 'hide', true, now())
        on conflict (viewer_profile_id, target_profile_id, action_type) do update
        set is_active = true,
            updated_at = now()
      `,
      [row.id, targetProfileId],
    );
  }

  return getFriendFeedForClerkUser(clerkUserId);
}
