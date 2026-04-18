import { neon } from '@neondatabase/serverless';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

for (const envFile of ['../.env.local', '../.env']) {
  try {
    process.loadEnvFile(fileURLToPath(new URL(envFile, import.meta.url)));
  } catch {
    // Local env files are optional; DATABASE_URL may already be set by the shell.
  }
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const connectionUrl = new URL(databaseUrl);
connectionUrl.searchParams.delete('channel_binding');
connectionUrl.searchParams.set('sslmode', 'require');

const sql = neon(connectionUrl.toString());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const collegesPath = path.join(__dirname, '..', 'app', 'colleges.json');

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitLocation(location) {
  const [city, state] = location.split(',').map((part) => part.trim());
  return {
    city: city || null,
    state: state || null,
  };
}

try {
  const schools = JSON.parse(await readFile(collegesPath, 'utf8'));

  for (const school of schools) {
    const { city, state } = splitLocation(school.state || '');

    await sql.query(
      `
        insert into schools (
          id,
          slug,
          name,
          city,
          state,
          size,
          size_bucket,
          tuition,
          tuition_bucket,
          band,
          image_url,
          bio,
          active,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, now())
        on conflict (id) do update set
          slug = excluded.slug,
          name = excluded.name,
          city = excluded.city,
          state = excluded.state,
          size = excluded.size,
          size_bucket = excluded.size_bucket,
          tuition = excluded.tuition,
          tuition_bucket = excluded.tuition_bucket,
          band = excluded.band,
          image_url = excluded.image_url,
          bio = excluded.bio,
          active = excluded.active,
          updated_at = now()
      `,
      [
        school.id,
        slugify(school.name),
        school.name,
        city,
        state,
        school.size,
        school.size?.split('·')[0]?.trim() || null,
        school.tuition,
        school.tuition,
        school.band,
        school.imageUrl || null,
        school.bio || null,
      ],
    );

    await sql.query('delete from school_tags where school_id = $1', [school.id]);

    for (const tag of school.tags || []) {
      await sql.query(
        `
          insert into school_tags (school_id, tag)
          values ($1, $2)
          on conflict (school_id, tag) do nothing
        `,
        [school.id, tag],
      );
    }
  }

  console.log(`Seeded ${schools.length} schools into Neon.`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
