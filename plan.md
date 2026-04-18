# HackMESA Data + API Plan

## Recommended Stack

- Frontend/runtime: Next.js on Vercel
- Auth: Clerk
- Primary database: Postgres, ideally Vercel Postgres or Neon
- File storage: Vercel Blob for school images
- Canonical external stats source: College Scorecard API
- Optional AI generation: server-side only for labeled synthetic vibe cards

## Why This Stack

- The current app is a Next.js app with a local `app/api/match/route.ts` and a static `app/colleges.json` file.
- The school catalog, stats, saved schools, and synthetic school content fit relational storage better than Convex.
- Clerk works well for login without forcing the main data model into a realtime database.
- Vercel Blob is a better fit than Convex for image files because the app can store only URL references in Postgres.

## Main Recommendation

Use `Clerk + Postgres + Vercel Blob` for launch.

Do not use Convex as the main school database.

If realtime social features become core later, such as live chat or live post feeds, then add Convex later for that specific surface instead of making it the source of truth for schools and stats.

## School Data Strategy

Start with a curated catalog, not the full national college universe.

Suggested launch size:

- 100 to 500 schools

For each school, store:

- identity fields: name, slug, state, city, school type
- matching fields: tags, size bucket, tuition bucket, vibe labels
- stats fields: tuition, acceptance rate, graduation rate, median earnings, enrollment
- outbound links: official site, admissions site, US News page
- assets: image URL
- generated content: labeled synthetic vibe cards or summaries

## External APIs To Use

### 1. College Scorecard API

Use this as the main factual stats source.

Best fields to ingest for launch:

- school name and identifiers
- city/state
- control: public/private
- size/enrollment
- net price / average cost
- admission rate
- graduation rate
- median earnings after attendance
- SAT/ACT ranges if available

Use it in a server-side sync job, not directly from the client.

### 2. US News

Use US News only as an outbound link stored per school.

Do not scrape or use it as a structured data source.

### 3. Official School Websites

Use these as manual verification sources for:

- admissions URL
- application deadlines
- program highlights
- image selection if you have usage rights

## Content Rules

- No scraped Reddit content
- No paraphrased Reddit content presented as real student reviews
- If you want community-style content, generate fully synthetic school vibe cards and label them clearly
- Generated content should be based on approved structured school inputs, not copied from public user posts

Recommended label:

- `Simulated student vibe card`

## Database Shape

### `schools`

Core school record.

Suggested columns:

- `id`
- `slug`
- `name`
- `city`
- `state`
- `control`
- `size_bucket`
- `tuition_bucket`
- `image_url`
- `official_url`
- `usnews_url`
- `bio`
- `active`
- `created_at`
- `updated_at`

### `school_stats`

Normalized stat snapshot.

Suggested columns:

- `school_id`
- `source`
- `source_updated_at`
- `acceptance_rate`
- `graduation_rate`
- `median_earnings`
- `avg_net_price`
- `undergrad_enrollment`
- `sat_reading_writing_mid`
- `sat_math_mid`
- `act_composite_mid`
- `raw_payload_json`
- `created_at`

### `school_tags`

Use this if tags start getting more complex than the current array approach.

Suggested columns:

- `school_id`
- `tag`

### `school_vibe_cards`

Stores labeled synthetic social-style content.

Suggested columns:

- `id`
- `school_id`
- `title`
- `body`
- `tone`
- `generated_by`
- `is_synthetic`
- `status`
- `created_at`

### `user_profiles`

Minimal app profile keyed to Clerk.

Suggested columns:

- `clerk_user_id`
- `display_name`
- `graduation_year`
- `home_state`
- `created_at`

### `saved_schools`

Suggested columns:

- `clerk_user_id`
- `school_id`
- `created_at`

### `quiz_results`

Suggested columns:

- `id`
- `clerk_user_id`
- `answers_json`
- `top_matches_json`
- `created_at`

## API Routes To Build

### Public app routes

- `POST /api/match`
  - keep this route
  - move source data from `app/colleges.json` to Postgres
  - keep the deterministic ranking logic

- `GET /api/schools`
  - returns curated school list
  - supports filter params later

- `GET /api/schools/[slug]`
  - returns one school with stats, links, image, and vibe cards

- `POST /api/user/saved-schools`
  - save or unsave a school for the signed-in Clerk user

- `GET /api/user/saved-schools`
  - fetch saved schools for the signed-in Clerk user

### Protected internal/admin routes

- `POST /api/admin/sync/scorecard`
  - pulls fresh data from College Scorecard and upserts it

- `POST /api/admin/generate-vibes`
  - generates synthetic vibe cards for schools that need them

- `POST /api/admin/revalidate-school`
  - optional route to refresh a single school page cache

## Image Plan

- Store image files in Vercel Blob
- Store only the returned URL in Postgres
- Use optimized JPG or WebP files
- Keep the launch catalog small so Hobby usage stays low

If you do not need uploads immediately, keeping trusted external image URLs is also acceptable for the first version.

## Migration Plan From Current App

### Phase 1

- keep current UI and `POST /api/match`
- replace `app/colleges.json` reads with Postgres queries
- preserve the current data shape so the React screens keep working

### Phase 2

- add a school detail route or modal
- show extra stats from `school_stats`
- add US News and official site links
- add labeled synthetic vibe cards

### Phase 3

- add Clerk auth to persist saved schools and quiz history
- wire `saved` state to database instead of only local client state

### Phase 4

- add admin sync script and optional protected admin UI

## Friend Matching Launch Plan

### Confirmed launch decisions

- matching feed should be `hybrid`
- seeded profiles must be clearly labeled as `Demo` or `AI`
- default profile avatars first, optional real photo uploads later
- if photo uploads are added later, allow only `one` profile photo per user
- if Clerk already has a user profile image, reuse that before building your own upload flow
- basic async messaging after mutual interest is acceptable at launch
- message threads should unlock only after mutual interest between two real users
- no message notifications at launch; unread state should stay in-app only
- no presence states like online, typing, or last seen at launch
- basic safety controls should exist at launch: `hide`, `block`, and `report`
- `block` should be mutual and immediate at launch
- `report` should be stored immediately, and profiles should auto-hide after about 2 reports pending manual review
- compatibility should be `precomputed and stored`
- compatibility should be recomputed synchronously when quiz answers, selected colleges, or match-profile fields change
- Gemini should `explain matches only`, not decide who matches whom
- Gemini explanations should be generated `on demand` and then cached
- expected showcase scale is `under 100 signed-up users`
- demo/AI profiles should backfill the feed only when too few real matches exist
- demo/AI profiles should be generated ahead of time and stored in Neon
- launch target for pre-generated demo/AI profiles is `30 to 50`, starting low first
- demo/AI profiles should be clearly limited in the UI, not treated exactly like real users
- launch friend feed should return about `10` profiles total, prioritizing real users first and backfilling only as needed
- no student-email or school verification requirement at launch
- simple real posts are acceptable at launch if they stay plain-text, scoped, and non-realtime

### Recommended launch architecture for compatible people

- real signed-in users live in Postgres
- demo profiles also live in Postgres or a seeded table so the feed never looks empty
- backfill rule should be deterministic, for example:
- show real matches first
- if fewer than 5 real matches exist, fill the remainder with labeled `Demo` or `AI` profiles
- target about `10` total cards in the feed at launch so it feels populated without needing a huge profile pool
- collect `home_state` explicitly in the opt-in profile form via a required dropdown
- let users edit their match profile and selected colleges anytime, then recompute compatibility synchronously after save
- eligibility requires:
  - completed quiz
  - prefer at least one overlapping selected college
- ranking should stay deterministic and explainable
- Gemini should only generate the human-facing `why you match` explanation and optional icebreaker text after a match card is opened

### Safe Gemini role in demo-profile backfill

Gemini can help here, but only as a content generator, not as the policy engine.

- use app logic to decide when backfill is needed
- use app logic to decide how many demo profiles to insert
- use Gemini to generate:
  - demo profile bios
  - demo profile interests/goals
  - optional `why you match` text for demo profiles
- store generated demo profiles in Postgres and label them clearly as `Demo` or `AI`
- pre-generate and store them before the showcase instead of generating them live during feed requests
- do not call Gemini on every feed load just to decide who appears

Recommended UI treatment:

- show a visible `Demo` or `AI` badge on these profiles
- keep them eligible for browsing and explanation text
- avoid implying that a real student is waiting for contact unless that action is explicitly simulated and labeled
- for launch, allow `view + save` only on Demo/AI profiles
- disable actions that imply a real response, such as `interested`, `send intro`, or messaging
- only real-user-to-real-user pairs should ever unlock message threads at launch

### Suggested additional tables

#### `match_profiles`

One row per visible person in the friend-matching system.

- `id`
- `clerk_user_id` nullable for demo profiles
- `display_name`
- `graduation_year`
- `major`
- `bio`
- `home_state`
- `avatar_type` (`initials`, `uploaded`, `demo`)
- `avatar_url` nullable
- `is_demo`
- `demo_label` (`Demo`, `AI`)
- `profile_status`
- `created_at`
- `updated_at`

Launch profile setting recommendation:

- add a simple visibility toggle so users can pause feed participation without deleting their profile

#### `match_profile_interests`

- `profile_id`
- `interest`

#### `match_profile_goals`

- `profile_id`
- `goal`

#### `match_profile_colleges`

- `profile_id`
- `school_id`
- `selection_rank`

Launch profile-card recommendation:

- show up to 3 selected schools on the visible match card/profile
- school overlap should be visible because it is a core matching signal
- show 3 to 5 interests and about 1 to 2 goals on the profile card

#### `compatibility_edges`

Precomputed compatibility graph between two profiles.

- `viewer_profile_id`
- `candidate_profile_id`
- `score`
- `shared_colleges_json`
- `shared_signals_json`
- `why_match_cached`
- `why_match_generated_at`
- `created_at`
- `updated_at`

#### `friend_actions`

Launch-safe social actions without realtime chat.

- `actor_profile_id`
- `target_profile_id`
- `action_type` (`saved`, `interested`, `dismissed`)
- `created_at`

#### `direct_message_threads`

Only create a thread after mutual interest between two real users.

Launch behavior:

- auto-create the thread after mutual interest
- show a simple `Say hi` prompt in the UI

- `id`
- `profile_a_id`
- `profile_b_id`
- `created_at`
- `updated_at`

#### `direct_messages`

Basic async launch messaging.

Launch scope:

- plain text only
- no image attachments
- no file uploads
- no voice notes
- no edit/delete UI at launch
- max message length should be about `500` characters

- `id`
- `thread_id`
- `sender_profile_id`
- `body`
- `created_at`
- `read_at` nullable

#### `posts`

Minimal launch posts.

- `id`
- `author_profile_id`
- `body`
- `created_at`
- `updated_at`

Launch scope:

- plain text only
- no image attachments
- no realtime updates
- scope the feed by the user's selected colleges, not globally
- standalone posts only, with no comments or replies at launch
- max post length should be about `500` characters
- order posts newest-first within the scoped feed

#### `post_interactions`

- `post_id`
- `actor_profile_id`
- `interaction_type` (`save`, `hide`, `report`)
- `created_at`

#### `profile_safety_actions`

Launch-safe trust controls.

- `actor_profile_id`
- `target_profile_id`
- `action_type` (`hide`, `block`, `report`)
- `report_reason` nullable
- `created_at`

Recommended launch rule:

- store every report
- do not build a full moderation dashboard first
- auto-hide a profile from the feed after 2 reports until manually reviewed

### Suggested friend-matching routes

- `GET /api/friends/feed`
  - returns precomputed compatible people for the signed-in user
  - mixes in demo/AI profiles if real-user supply is low

- `POST /api/friends/profile`
  - create or update the current user's visible match profile

- `POST /api/friends/actions`
  - save, dismiss, or mark interested

- `GET /api/messages/threads`
  - list existing mutual-interest message threads for the signed-in user

- `GET /api/messages/[threadId]`
  - fetch messages in one thread

- `POST /api/messages/[threadId]`
  - send a message into an existing thread

- `GET /api/posts`
  - fetch a simple posts feed

- `POST /api/posts`
  - create a plain-text post

Safety UI recommendation:

- expose `block` and `report` actions inside the message thread UI as well as on profile cards

- `POST /api/friends/safety`
  - hide, block, or report another profile

- `POST /api/friends/recompute`
  - recompute compatibility edges after quiz/profile/college changes

- `POST /api/friends/explain`
  - calls Gemini only when a user opens a match card and no cached explanation exists yet

### Matching logic recommendation

Keep this deterministic and local to your app.

- gate first by overlapping selected colleges
- treat overlapping selected colleges as the primary eligibility/ranking tier
- if too few real matches exist, widen the feed with a fallback tier using proximity plus overall quiz/profile compatibility
- then score:
  - shared selected colleges
  - shared quiz answers
  - compatible hobbies/interests
  - compatible goals
  - same home state as the fallback-tier proximity boost

Recommended fallback order:

- tier 1: shared selected college(s)
- tier 2: no shared college, but same home state plus strong overall compatibility
- store the resulting score and shared reasons in `compatibility_edges`

Gemini should read the stored structured reasons and turn them into:

- `why you match`
- optional `good opener`

Launch compatibility presentation:

- show an exact compatibility percentage on the card
- also show a short human-readable reason explaining the match

### Profile input recommendation

- collect interests from a fixed pick-list at launch, not fully free-form text
- collect goals from a fixed pick-list at launch, not fully free-form text
- this keeps compatibility scoring deterministic and makes demo/AI profile generation much easier to control

### Blob and free-tier impact for friend matching

With under 100 users, avatar-first launch is still safely within free-tier assumptions.

- if most users use initials avatars, Blob usage stays near zero
- if later 50 users upload one 250 KB profile image each, storage is only about 12.5 MB
- even 100 users with one 300 KB image each is only about 30 MB of Blob storage
- keeping photo upload to one image per user materially reduces storage, transfer, and moderation scope
- Neon storage for under 100 users plus compatibility edges is tiny compared with the free 0.5 GB limit

The main free-tier risks are not storage. They are:

- too many Gemini calls if explanations are regenerated repeatedly
- too many large uploaded images later
- always recomputing compatibility live instead of storing it
- heavy messaging usage later if polling is too aggressive
- real posts can also create load later if the feed becomes broad or highly active

### Recommendation to stay within free tiers

- use initials avatars at first
- let photo upload come later behind Vercel Blob
- precompute compatibility edges after profile or college updates
- do the recompute synchronously at launch rather than adding a background queue too early
- cache Gemini explanations after first generation
- if messaging is added, keep it basic async after mutual interest rather than realtime chat
- no live pairwise recomputation on feed load
- respect safety actions in feed generation so hidden or blocked profiles do not reappear
- a block should remove both profiles from each other's feed and make that pair ineligible for future compatibility caching
- if a block happens after a message thread exists, keep the thread history read-only and prevent further sending

## Implementation Checklist

### Phase 1: Core profile and opt-in

- add new Neon tables for:
  - `match_profiles`
  - `match_profile_interests`
  - `match_profile_goals`
  - `match_profile_colleges`
  - `compatibility_edges`
  - `friend_actions`
  - `profile_safety_actions`
- update `scripts/init-neon-schema.mjs` with those tables and indexes
- add a minimal opted-in profile form after quiz/college selection
- prefill `display_name` and `avatar_url` from Clerk when available
- collect required profile fields:
  - `graduation_year`
  - `major`
  - `home_state`
  - short `bio`
  - fixed-pick-list interests
  - fixed-pick-list goals
- add a visibility toggle on the profile
- save the selected colleges into `match_profile_colleges`

### Phase 2: Compatibility graph

- implement a deterministic compatibility scorer in server code
- use primary tier:
  - shared selected colleges
- use fallback tier:
  - same home state + strong compatibility
- store score and structured shared reasons in `compatibility_edges`
- recompute synchronously when any of these change:
  - quiz answers
  - selected colleges
  - match-profile fields
- respect `hide`, `block`, and `report` rules in feed generation

### Phase 3: Feed and cards

- replace static `FRIENDS` feed with `GET /api/friends/feed`
- return about `10` cards total
- prioritize real users first
- backfill with pre-generated `Demo`/`AI` profiles only when needed
- show on the card:
  - profile image or avatar
  - `Demo`/`AI` badge if applicable
  - compatibility percentage
  - short reason
  - up to 3 selected schools
  - 3 to 5 interests
  - 1 to 2 goals
- allow on real profiles:
  - save
  - interested
  - hide
  - block
  - report
- allow on demo/AI profiles:
  - view
  - save

### Phase 4: Gemini explanation caching

- add `POST /api/friends/explain`
- on card open, check `compatibility_edges.why_match_cached`
- if missing, generate explanation with Gemini using structured reasons only
- cache the generated explanation and timestamp
- do not use Gemini for eligibility or score ranking

### Phase 5: Demo/AI profile pool

- create a script to pre-generate and store `30 to 50` demo/AI profiles
- label each seeded profile as `Demo` or `AI`
- generate ahead of time, not during live requests
- include realistic combinations of:
  - schools
  - majors
  - interests
  - goals
  - home states
- make sure they only backfill when the real feed is too sparse

### Phase 6: Safety controls

- add `POST /api/friends/safety`
- implement `hide`
- implement mutual `block`
- implement `report`
- auto-hide profiles after about `2` reports pending manual review
- if a blocked pair has a thread, keep the thread read-only
- expose `block` and `report` from both:
  - profile cards
  - message thread UI

### Phase 7: Basic async messaging

- add Neon tables for:
  - `direct_message_threads`
  - `direct_messages`
- auto-create a thread only after mutual interest between two real users
- add routes:
  - `GET /api/messages/threads`
  - `GET /api/messages/[threadId]`
  - `POST /api/messages/[threadId]`
- keep launch messaging:
  - plain text only
  - `500` char max
  - no attachments
  - no edit/delete
  - no notifications
  - no typing/online/last-seen states
  - no realtime websockets
- refresh messages:
  - on open
  - after send
  - optional manual refresh

### Phase 8: Simple real posts

- add Neon tables for:
  - `posts`
  - `post_interactions`
- add routes:
  - `GET /api/posts`
  - `POST /api/posts`
- keep launch posts:
  - plain text only
  - `500` char max
  - scoped by selected colleges
  - newest first
  - no comments/replies
  - no media
  - no realtime

### Phase 9: Optional later upgrades

- custom Vercel Blob photo uploads
- one real profile photo per user
- email or push notifications
- moderation dashboard
- richer post interactions
- threaded comments
- realtime chat or presence
- broader search/discovery beyond feed-only visibility

### Recommended build order

- start with Phases 1 to 3 first
- then add Phase 6 safety controls before opening the feed widely
- then add Phase 4 Gemini explanation caching
- then add Phase 5 demo/AI pool for showcase polish
- only after that add Phase 7 messaging
- add Phase 8 posts last if time allows

## Free Tier Notes

- Vercel Hobby is fine for a prototype
- Vercel Blob is free only within Hobby limits
- If Blob limits are exceeded on Hobby, Vercel says Blob access is blocked until the usage window resets or you upgrade
- A small curated image library should be fine on Hobby
- Postgres free tier is usually more important to watch than Blob for this app unless you start storing many large images

## Final Recommendation

Use this launch architecture:

- Clerk for auth
- Vercel Postgres or Neon for primary data
- Vercel Blob for images
- College Scorecard for factual stats sync
- US News as outbound links only
- synthetic labeled vibe cards stored in Postgres

Do not make Convex the main database for launch unless you decide realtime social features are more important than the school catalog.
