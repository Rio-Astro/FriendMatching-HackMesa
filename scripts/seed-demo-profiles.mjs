import { neon } from '@neondatabase/serverless';
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

const FIRST_NAMES = [
  'Avery', 'Riley', 'Noah', 'Sofia', 'Mateo', 'Leah', 'Milo', 'Nina', 'Owen', 'Zara', 'Jules', 'Kai',
  'Ivy', 'Luca', 'Tessa', 'Aria', 'Eli', 'Mina', 'Rowan', 'Skye', 'Theo', 'Hazel', 'Ezra', 'Lina',
  'Micah', 'Sage', 'Nico', 'Remy', 'Cleo', 'Anya', 'Maren', 'Ellis', 'Piper', 'Ari', 'Jonah', 'Mira',
];

const LAST_INITIALS = ['R.', 'T.', 'P.', 'K.', 'W.', 'D.', 'L.', 'S.'];
const HOME_STATES = ['CA', 'TX', 'NY', 'FL', 'IL', 'WA', 'CO', 'MA', 'GA', 'NC', 'MN', 'AZ'];
const MAJORS = ['Neuroscience', 'Creative Writing', 'Computer Science', 'Environmental Studies', 'Global Studies', 'Film', 'Public Health', 'Design'];
const INTEREST_POOLS = [
  ['creative writing', 'film photography', 'museums', 'coffee shops', 'late-night diners'],
  ['hiking', 'running', 'surfing', 'baking sourdough', 'podcasts'],
  ['music', 'piano', 'thrifting', 'board games', 'coffee shops'],
  ['research', 'gaming', 'cooking', 'museums', 'soccer'],
  ['global studies', 'podcasts', 'running', 'pickup soccer', 'museums'],
  ['design', 'comics', 'climbing', 'film photography', 'zines'],
];
const GOAL_POOLS = [
  ['find a study partner', 'make a close friend group', 'find weekend plans'],
  ['build a creative crew', 'join a campus org', 'meet future roommates'],
  ['find a study partner', 'join a campus org', 'meet future roommates'],
  ['make a close friend group', 'build a creative crew', 'find weekend plans'],
];
const BIOS = [
  'Looking for the kind of people who will turn a random Tuesday into a museum trip or a study sprint.',
  'I am most likely to say yes to a sunrise plan, a coffee walk, or a low-pressure creative night.',
  'Hoping to land in a friend group that is kind, curious, and down for both deep talks and dumb jokes.',
  'I like people who can lock in for an hour, then wander out for food and talk about the week after.',
  'Trying to find a couple of people who want a real routine together, not just one-off hangouts.',
  'I usually end up planning the outing, bringing the snacks, and making sure everyone actually leaves the dorm.',
];
const COVER_URLS = [
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1469571486292-b53601020f52?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1529154691717-3306083d869e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80',
];
const DEMO_AVATAR_EMOJI = '🤖';
const SCHOOL_IDS = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8'];
const DEMO_SOCIAL_LINKS = [
  {
    platform: 'linkedin',
    handle: 'jen-hsun-huang',
    visibility: 'public',
    url: 'https://www.linkedin.com/in/jen-hsun-huang/',
  },
];

function buildInitials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function buildReason(primarySchoolName, interestA, goalA) {
  return `You both picked <b>${primarySchoolName}</b>, and this profile also leans into <b>${interestA}</b> with a goal to <b>${goalA}</b>.`;
}

function makeProfiles() {
  return Array.from({ length: 36 }, (_, index) => {
    const name = `${FIRST_NAMES[index]} ${LAST_INITIALS[index % LAST_INITIALS.length]}`;
    const interests = INTEREST_POOLS[(index * 5 + 1) % INTEREST_POOLS.length];
    const goals = GOAL_POOLS[(index * 3 + 2) % GOAL_POOLS.length];
    const primarySchoolId = SCHOOL_IDS[(index * 3 + 1) % SCHOOL_IDS.length];
    let secondarySchoolId = SCHOOL_IDS[(index * 5 + 2) % SCHOOL_IDS.length];

    if (secondarySchoolId === primarySchoolId) {
      secondarySchoolId = SCHOOL_IDS[(index * 5 + 3) % SCHOOL_IDS.length];
    }

    const selectedSchoolIds = [
      primarySchoolId,
      secondarySchoolId,
    ];

    return {
      demoKey: `demo-profile-${String(index + 1).padStart(2, '0')}`,
      displayName: name,
      graduationYear: 2027 + ((index * 3) % 4),
      major: MAJORS[(index * 5 + 3) % MAJORS.length],
      bio: BIOS[index % BIOS.length],
      homeState: HOME_STATES[(index * 7 + 2) % HOME_STATES.length],
      avatarEmoji: DEMO_AVATAR_EMOJI,
      coverImageUrl: COVER_URLS[(index * 7 + 4) % COVER_URLS.length],
      initials: buildInitials(name),
      interests,
      goals,
      selectedSchoolIds,
      profileStatus: 'active',
      demoLabel: index % 3 === 0 ? 'AI' : 'Demo',
      socialLinks: DEMO_SOCIAL_LINKS,
      whyTemplate: {
        interest: interests[0],
        goal: goals[0],
      },
    };
  });
}

try {
  const profiles = makeProfiles();
  const schoolRows = await sql.query(
    `
      select id, name
      from schools
      where id = any($1)
    `,
    [SCHOOL_IDS],
  );
  const schoolNameById = new Map(schoolRows.map((row) => [row.id, row.name]));

  for (const profile of profiles) {
    const existingRows = await sql.query(
      `
        select id
        from match_profiles
        where is_demo = true
          and (
            demo_key = $1
            or (demo_key is null and display_name = $2)
          )
        order by created_at asc, id asc
      `,
      [profile.demoKey, profile.displayName],
    );

    let profileId = existingRows[0]?.id;

    if (!profileId) {
      const insertedRows = await sql.query(
        `
          insert into match_profiles (
            clerk_user_id,
            demo_key,
            display_name,
            graduation_year,
            major,
            bio,
            home_state,
            avatar_type,
            avatar_url,
            avatar_emoji,
            cover_image_url,
            social_links_json,
            is_demo,
            demo_label,
            profile_status,
            updated_at
          )
          values (null, $1, $2, $3, $4, $5, $6, 'demo', null, $7, $8, $9::jsonb, true, $10, $11, now())
          returning id
        `,
        [
          profile.demoKey,
          profile.displayName,
          profile.graduationYear,
          profile.major,
          profile.bio,
          profile.homeState,
          profile.avatarEmoji,
          profile.coverImageUrl,
          JSON.stringify(profile.socialLinks),
          profile.demoLabel,
          profile.profileStatus,
        ],
      );
      profileId = insertedRows[0]?.id;
    }

    if (!profileId) {
      continue;
    }

    const duplicateRows = existingRows.slice(1);

    for (const duplicateRow of duplicateRows) {
      await sql.query('delete from match_profiles where id = $1', [duplicateRow.id]);
    }

    await Promise.all([
      sql.query('delete from match_profile_interests where profile_id = $1', [profileId]),
      sql.query('delete from match_profile_goals where profile_id = $1', [profileId]),
      sql.query('delete from match_profile_colleges where profile_id = $1', [profileId]),
      sql.query(
        `
          update match_profiles
          set demo_key = $2,
              display_name = $3,
              graduation_year = $4,
              major = $5,
              bio = $6,
              home_state = $7,
              avatar_type = 'demo',
              avatar_url = null,
              avatar_emoji = $8,
              cover_image_url = $9,
              social_links_json = $10::jsonb,
              is_demo = true,
              demo_label = $11,
              profile_status = $12,
              updated_at = now()
          where id = $1
        `,
        [profileId, profile.demoKey, profile.displayName, profile.graduationYear, profile.major, profile.bio, profile.homeState, profile.avatarEmoji, profile.coverImageUrl, JSON.stringify(profile.socialLinks), profile.demoLabel, profile.profileStatus],
      ),
    ]);

    for (const interest of profile.interests) {
      await sql.query(
        `
          insert into match_profile_interests (profile_id, interest)
          values ($1, $2)
          on conflict (profile_id, interest) do nothing
        `,
        [profileId, interest],
      );
    }

    for (const goal of profile.goals) {
      await sql.query(
        `
          insert into match_profile_goals (profile_id, goal)
          values ($1, $2)
          on conflict (profile_id, goal) do nothing
        `,
        [profileId, goal],
      );
    }

    for (const [selectionIndex, schoolId] of profile.selectedSchoolIds.entries()) {
      await sql.query(
        `
          insert into match_profile_colleges (profile_id, school_id, selection_rank)
          values ($1, $2, $3)
          on conflict (profile_id, school_id) do update
          set selection_rank = excluded.selection_rank
        `,
        [profileId, schoolId, selectionIndex + 1],
      );
    }

    const primarySchoolName = schoolNameById.get(profile.selectedSchoolIds[0]) || 'your top school';
    const why = buildReason(primarySchoolName, profile.whyTemplate.interest, profile.whyTemplate.goal);

    await sql.query(
      `
        update match_profiles
        set bio = $2
        where id = $1
      `,
      [profileId, `${profile.bio} ${why}`],
    );
  }

  console.log(`Seeded ${profiles.length} demo friend profiles into Neon.`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
