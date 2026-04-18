import { neon } from '@neondatabase/serverless';

import type { QuizAnswers, School } from '@/lib/types';

type SchoolRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  size: string | null;
  tuition: string | null;
  band: string | null;
  image_url: string | null;
  bio: string | null;
  tags: string[] | null;
};

type UserProfileRow = {
  selected_school_ids_json: unknown;
};

type SavedSchoolRow = {
  school_id: string;
};

type QuizResultRow = {
  answers_json: unknown;
};

export type PersistedUserState = {
  savedSchoolIds: string[];
  selectedSchoolIds: string[];
  quizAnswers: QuizAnswers;
};

function isMissingSelectedSchoolsColumnError(error: unknown) {
  return error instanceof Error && error.message.includes('selected_school_ids_json');
}

function sanitizeDatabaseUrl(databaseUrl: string) {
  const connectionUrl = new URL(databaseUrl);
  connectionUrl.searchParams.delete('channel_binding');
  connectionUrl.searchParams.set('sslmode', 'require');
  return connectionUrl.toString();
}

let sqlClient: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  if (!sqlClient) {
    sqlClient = neon(sanitizeDatabaseUrl(process.env.DATABASE_URL));
  }

  return sqlClient;
}

function formatLocation(city: string | null, state: string | null) {
  if (city && state) {
    return `${city}, ${state}`;
  }

  return city || state || '';
}

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

function mapSchoolRow(row: SchoolRow): School {
  return {
    id: row.id,
    name: row.name,
    state: formatLocation(row.city, row.state),
    size: row.size || '',
    tuition: row.tuition || '',
    band: row.band || '',
    tags: row.tags || [],
    imageUrl: row.image_url,
    bio: row.bio || '',
  };
}

export async function getActiveSchools(): Promise<School[]> {
  const sql = getSql();
  const rows = (await sql.query(`
    select
      s.id,
      s.name,
      s.city,
      s.state,
      s.size,
      s.tuition,
      s.band,
      s.image_url,
      s.bio,
      coalesce(
        array_agg(st.tag order by st.tag) filter (where st.tag is not null),
        '{}'
      ) as tags
    from schools s
    left join school_tags st on st.school_id = s.id
    where s.active = true
    group by s.id, s.name, s.city, s.state, s.size, s.tuition, s.band, s.image_url, s.bio
    order by s.name asc
  `)) as SchoolRow[];

  return rows.map(mapSchoolRow);
}

export async function ensureUserProfile(
  clerkUserId: string,
  profile: {
    displayName?: string | null;
  } = {},
) {
  const sql = getSql();

  await sql.query(
    `
      insert into user_profiles (clerk_user_id, display_name)
      values ($1, $2)
      on conflict (clerk_user_id) do update
      set display_name = coalesce(excluded.display_name, user_profiles.display_name),
          updated_at = now()
    `,
    [clerkUserId, profile.displayName || null],
  );
}

export async function getUserState(clerkUserId: string): Promise<PersistedUserState> {
  const sql = getSql();

  let profileRows: UserProfileRow[] = [];

  try {
    profileRows = await (sql.query(
      `
        select selected_school_ids_json
        from user_profiles
        where clerk_user_id = $1
        limit 1
      `,
      [clerkUserId],
    ) as unknown as Promise<UserProfileRow[]>);
  } catch (error) {
    if (!isMissingSelectedSchoolsColumnError(error)) {
      throw error;
    }
  }

  const [savedSchoolRows, quizResultRows] = await Promise.all([
    sql.query(
      `
        select school_id
        from saved_schools
        where clerk_user_id = $1
        order by created_at asc
      `,
      [clerkUserId],
    ) as unknown as Promise<SavedSchoolRow[]>,
    sql.query(
      `
        select answers_json
        from quiz_results
        where clerk_user_id = $1
        order by created_at desc
        limit 1
      `,
      [clerkUserId],
    ) as unknown as Promise<QuizResultRow[]>,
  ]);

  return {
    savedSchoolIds: savedSchoolRows.map((row) => row.school_id),
    selectedSchoolIds: normalizeStringArray(profileRows[0]?.selected_school_ids_json),
    quizAnswers: normalizeQuizAnswers(quizResultRows[0]?.answers_json),
  };
}

export async function setSelectedSchoolIds(clerkUserId: string, selectedSchoolIds: string[]) {
  const sql = getSql();

  try {
    await sql.query(
      `
        update user_profiles
        set selected_school_ids_json = $2::jsonb,
            updated_at = now()
        where clerk_user_id = $1
      `,
      [clerkUserId, JSON.stringify(selectedSchoolIds)],
    );
  } catch (error) {
    if (isMissingSelectedSchoolsColumnError(error)) {
      throw new Error('Database schema is out of date. Run npm run db:init to add selected_school_ids_json.');
    }

    throw error;
  }
}

export async function setSavedSchool(clerkUserId: string, schoolId: string, saved: boolean) {
  const sql = getSql();

  if (saved) {
    await sql.query(
      `
        insert into saved_schools (clerk_user_id, school_id)
        values ($1, $2)
        on conflict (clerk_user_id, school_id) do nothing
      `,
      [clerkUserId, schoolId],
    );
    return;
  }

  await sql.query(
    `
      delete from saved_schools
      where clerk_user_id = $1
        and school_id = $2
    `,
    [clerkUserId, schoolId],
  );
}

export async function saveQuizResult(clerkUserId: string, answers: QuizAnswers, topMatchesJson?: unknown) {
  const sql = getSql();

  await sql.query(
    `
      insert into quiz_results (clerk_user_id, answers_json, top_matches_json)
      values ($1, $2::jsonb, $3::jsonb)
    `,
    [
      clerkUserId,
      JSON.stringify(answers),
      topMatchesJson === undefined ? null : JSON.stringify(topMatchesJson),
    ],
  );
}
