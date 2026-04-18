import { neon } from '@neondatabase/serverless';

import type { School } from '@/lib/types';

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

function sanitizeDatabaseUrl(databaseUrl: string) {
  const connectionUrl = new URL(databaseUrl);
  connectionUrl.searchParams.delete('channel_binding');
  connectionUrl.searchParams.set('sslmode', 'require');
  return connectionUrl.toString();
}

let sqlClient: ReturnType<typeof neon> | null = null;

function getSql() {
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
