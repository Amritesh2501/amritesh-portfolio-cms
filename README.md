# Amritesh Tiwari / Portfolio + Headless CMS

A personal developer portfolio where **every public string lives in Postgres** and is
edited from a secure `/admin` dashboard. No portfolio content is hardcoded in any
component. Changing what the site says never means touching source.

- **Public site** at `/` reads exclusively from the database.
- **CMS** at `/admin` is a real internal product: auth, tables, forms, media, messages.
- **Auth is server-side.** Every admin route and every mutating action verifies a
  signed session against a bcrypt hash in Postgres.

---

## Table of contents

1. [Quick start](#quick-start)
2. [Environment variables](#environment-variables)
3. [How to change every kind of content](#how-to-change-every-kind-of-content-without-touching-code)
4. [Design](#design)
5. [Architecture](#architecture)
6. [Adding a new content type](#adding-a-new-content-type)
7. [Storage](#storage)
8. [Security model](#security-model)
9. [Deployment](#deployment)
10. [What was verified, and how](#what-was-verified-and-how)
11. [Decisions and assumptions](#decisions-and-assumptions)
12. [Before you publish](#before-you-publish)

---

## Quick start

Requires Node 20+ and Docker (or any Postgres 14+ you point `DATABASE_URL` at).

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env
#    then generate a secret and paste it into AUTH_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
#    and set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD to what you want to log in with

# 3. database
docker compose up -d          # Postgres on host port 5433
npx prisma migrate deploy     # apply the schema
npm run db:seed               # load the real content

# 4. run
npm run dev
```

Then:

- public site: <http://localhost:3000>
- CMS: <http://localhost:3000/admin> (sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)

`npm run setup` is shorthand for steps 3's last two commands plus `prisma generate`.

The compose file maps Postgres to **5433**, not 5432, so it will not collide with a
Postgres you already run locally.

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` then a production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create and apply a new migration in dev |
| `npm run db:deploy` | Apply existing migrations (use in CI/prod) |
| `npm run db:seed` | Load or refresh seed content (idempotent) |
| `npm run db:studio` | Prisma Studio, a raw table browser |
| `npm run db:reset` | Drop, re-migrate and re-seed. **Destroys all content.** |

The seed is **idempotent** and safe to re-run: it upserts by natural key
(slug, name, email). Re-running it restores any seeded row you deleted, and
refreshes the *structure* of site settings without overwriting values you have
edited in admin.

---

## Environment variables

Every variable is documented in [`.env.example`](.env.example). `.env` is gitignored
and must never be committed.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. **The only thing you change** to move from local Docker to Neon, Supabase, RDS or Railway. |
| `AUTH_SECRET` | yes | Signs the session JWT. 32 random bytes. Changing it logs everyone out. |
| `AUTH_URL` | prod | Canonical origin, for correct cookie and callback URLs. |
| `AUTH_TRUST_HOST` | prod | `true` when behind a proxy (Vercel, Nginx, Fly). |
| `SEED_ADMIN_EMAIL` | seed | First admin account's email. |
| `SEED_ADMIN_PASSWORD` | seed | First admin password. Minimum 8 characters. The seed refuses to run in production with the placeholder value. |
| `SEED_ADMIN_NAME` | no | Display name for that account. |
| `STORAGE_DRIVER` | no | `local` (default) or `s3`. |
| `S3_*` | if s3 | Endpoint, region, bucket, keys, public base URL, path-style flag. |
| `UPLOAD_MAX_BYTES` | no | Max upload size, default 5 MB. See [Storage](#storage). |
| `CONTACT_RATE_LIMIT` | no | Contact submissions allowed per window per IP, default 5. |
| `CONTACT_RATE_WINDOW_SECONDS` | no | Window length, default 3600. |
| `NEXT_PUBLIC_SITE_URL` | no | Used for canonical URLs and OG tags. |
| `DIRECT_URL` | migrations | Unpooled URL used only by migrations. Same value as `DATABASE_URL` when there is no connection pooler; the Docker entrypoint defaults it for you. |
| `SEED_ON_START` | no | `true` runs the seed once at container boot. Off by default. See [Deployment](#deployment). |

---

## How to change every kind of content without touching code

Sign in at `/admin`. Everything below is a form, and every change appears on the
public site on the next page load.

| I want to change | Go to | Notes |
|---|---|---|
| Name, headline, bio, hero copy, philosophy, current focus | **Profile** | Single record. Hero tagline and description are what the first viewport shows. |
| Availability badge in the header | **Profile** > Availability | `Open to work` turns the indicator green. Clear "Availability text" to hide the badge entirely. |
| Add / edit / delete a project | **Projects** | Full case study fields, plus repeatable Technologies, Metrics and Gallery rows. |
| Publish or unpublish a project | **Projects** list > Publish / Unpublish | Only `Published` rows are ever public. |
| Reorder projects | **Projects** list > the up/down arrows | Writes `displayOrder`. |
| Copy a project as a starting point | **Projects** list > Duplicate | The copy is always created as a **Draft**. |
| See a project before it goes live | **Projects** > edit > Preview | Available once the record exists. |
| The filter chips above the project grid | **Project categories** | A chip appears only when a category has at least one published project. Add a category, attach a project, done. |
| Jobs and internships | **Experience** | Achievements are one per line. Technologies are repeatable rows. |
| Degrees | **Education** | |
| The technology lists | **Skills** and **Skill categories** | A category disappears from the site when it has no published skills. Proficiency renders a hairline bar; leave it blank to show just the name. |
| Certifications | **Certifications** | |
| The numbers strip under the hero | **Achievements** | Nothing about this strip is hardcoded, including how many there are. |
| GitHub / LinkedIn / email links | **Social links** | Set `Enabled` and publish. `Icon` takes a slug from simpleicons.org. |
| Header and footer menus | **Navigation** | Rename, reorder, hide, add. `Location` picks header, footer or both. |
| Site title, tagline, logo, footer text, contact heading and blurb | **Site settings** | |
| Accent colour, substrate colours, film grain, light/dark | **Theme** | Values are written onto the document root as CSS variables, so the whole site repaints with no rebuild. See the note below on how colours and mode interact. |
| Page title, meta description, keywords, OG image, favicon, robots | **SEO** | Project pages generate their own metadata from the project record. |
| Upload, replace, describe, delete images and PDFs | **Media** | Every image field has a **Library** button that picks from here. **Copy URL** gives you the path to paste anywhere. |
| Read and delete contact submissions | **Messages** | Unread count shows in the sidebar. Reply opens your mail client. |

**Publish states.** Every content type is `Draft`, `Published` or `Archived`. The public
site queries only `Published`. Drafts are invisible to visitors, and a draft project's
detail page returns a real 404, not a blank page.

---

## Design

The surface language is Apple-adjacent (generous space, soft radii, refined
type, quiet depth) carrying the original identity: dark-first substrate, a
single accent, and monospace reserved for anything technical.

- **One radius scale** (`--r-xs` through `--r-full`) used everywhere. Buttons are
  pills, cards are 24px, inputs are 12px. No mixed corner systems.
- **Type** is Inter for the interface and JetBrains Mono for metadata. Inter is
  the closest freely licensed analogue to SF Pro.
- **Motion** is scroll-linked and driven entirely by motion values, never React
  state, so nothing re-renders per frame. There is no `scroll` event listener
  anywhere. Every effect collapses under `prefers-reduced-motion`:
  - `Reveal` / `RevealGroup` sequence a section on entry
  - `Parallax` gives columns a slight counter-drift
  - `HeroParallax` hands the viewport off as the hero scrolls away
  - `ScrollProgress` is the hairline accent bar at the top
- **Initial loading screen** (`BootScreen`) shows once per browser session,
  never on internal navigation, is skipped entirely under reduced motion, has a
  hard dismissal ceiling so it can never trap anyone, and is behind the
  `site.showIntro` CMS toggle.

### Theme: how colours and mode interact

`theme.mode` picks the base palette. The accent applies to both modes.

The four substrate colours (background, surface, foreground, muted) are a
**dark-palette customisation**. In light mode they are deliberately not
injected, because painting dark hex values over the light palette produces
unreadable text. Light mode uses the built-in light palette plus your accent.

If you want to hand-tune light-mode colours, add `theme.light.*` rows to
`SiteSetting` and read them in `src/app/layout.tsx`; the settings table needs no
migration for that.

---

## Architecture

```
prisma/
  schema.prisma        19 models, the whole content model
  migrations/          checked in, applied with `prisma migrate deploy`
  seed.ts              the real content, idempotent
src/
  app/
    (site)/            public site
      (home)/          the home page and its loading skeleton
      projects/        index and /projects/[slug]
    admin/
      login/           unauthenticated
      (protected)/     everything behind the session check
        [resource]/    ONE generic list + ONE generic form, for all 11 resources
    api/
      auth/            Auth.js handlers
      admin/media/     the media picker's read endpoint
  actions/             all mutations. every one starts with requireAdmin()
  components/
    site/              public components
    admin/             CMS components
  lib/
    db.ts              Prisma client singleton
    auth.ts            Auth.js config + requireAdmin()
    content.ts         the ONLY place the public site reads from Postgres
    resources.ts       the CMS registry: fields, columns, validation
    admin-data.ts      server-side plumbing for the generic admin screens
    storage.ts         storage adapter, local + s3 drivers
    rate-limit.ts      fixed-window limiter
    utils.ts           dates, slugs, markdown
  middleware.ts        edge cookie pre-check
```

Two rules hold the whole thing together:

**1. UI never touches the database.** Public pages call `lib/content.ts`, which
filters `status: PUBLISHED` on every single query. A page cannot leak a draft by
forgetting a where-clause, because pages do not write where-clauses.

**2. The admin is generated, not written.** `lib/resources.ts` describes each content
type once: its fields, its list columns, its ordering, its validation. From that one
description come the list table, the edit form, the Zod schema and the server action
behaviour. There are eleven content types and exactly one list page and one form page.

---

## Adding a new content type

Blog, Testimonials, Speaking, Awards and Case Studies all fit the existing pattern.
Three steps, no rewrites:

1. **Add the Prisma model.** Include `status ContentStatus`, `displayOrder Int`,
   `publishedAt`, `updatedBy`, `createdAt`, `updatedAt`. Run `npm run db:migrate`.
2. **Add a `ResourceDef`** to `RESOURCES` in `src/lib/resources.ts`: the fields, the
   list columns, the ordering.
3. **Add one line** to the sidebar group in `src/app/admin/(protected)/layout.tsx`.

You now have a list screen with search, filtering, reordering, publish/unpublish and
delete, plus a validated edit form. To surface it publicly, add a query to
`lib/content.ts` (copy any existing one, they are three lines) and render it.

---

## Storage

Uploads go through one interface with two drivers, chosen by `STORAGE_DRIVER`.

**`local`** (default) writes to `public/uploads/`. Those files are served by a
route handler at `/api/uploads/*`, with a `beforeFiles` rewrite pointing
`/uploads/*` at it, because Next builds its `public/` manifest at BUILD time: a
file the CMS uploads afterwards is on disk and in the database but 404s under
`next start`. The dev server hides this by reading `public/` per request, so it
only shows up in production. Good for development and single-server deploys. It
does **not** survive an ephemeral filesystem, so do not use it on Vercel or Fly
machines.

**`s3`** talks to any S3-compatible bucket (AWS S3, Cloudflare R2, MinIO, DigitalOcean
Spaces) over plain `fetch` with SigV4 request signing. There is no AWS SDK dependency:
the two operations needed are PUT and DELETE, which is about sixty lines of signing
versus roughly ten megabytes of SDK. Set `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` and `S3_PUBLIC_BASE_URL`. Set
`S3_FORCE_PATH_STYLE=true` for MinIO and R2.

Switching drivers is an env change. No code changes, and existing rows keep working
because the database stores the resolved URL.

**Upload limits.** `UPLOAD_MAX_BYTES` (default 5 MB) is enforced server-side along with
a MIME allowlist (JPEG, PNG, WebP, AVIF, GIF, SVG, PDF). Filenames are stripped to a
safe slug plus a random suffix, so a name like `../../../etc/passwd` cannot escape the
upload directory.

One thing worth knowing: Next.js caps Server Action request bodies at 1 MB by default,
and uploads go through a Server Action. `next.config.ts` therefore derives
`serverActions.bodySizeLimit` from `UPLOAD_MAX_BYTES` plus 2 MB of headroom. That
headroom is deliberate: a file slightly over your limit gets refused by the app's own
validation with a message that names the limit, rather than dying inside the framework
with an opaque 500. If you raise `UPLOAD_MAX_BYTES`, the body limit follows
automatically, but you must **restart** the server, because `next.config.ts` is read at
boot.

---

## Security model

- **Passwords** are bcrypt hashed, cost 12. The login path compares against a dummy
  hash when the email is unknown, so a wrong email and a wrong password take the same
  time and cannot be distinguished by timing.
- **Sessions** are Auth.js JWTs, 8 hour expiry, HTTP-only cookies.
- **Two layers of authorization.** `middleware.ts` does a cheap edge check that a
  session cookie is *present*, purely to redirect anonymous visitors quickly. The real
  check is `auth()` in the protected admin layout and `requireAdmin()` at the top of
  **every** mutating action. `requireAdmin()` throws rather than returning a boolean,
  so a forgotten `if` cannot silently permit an anonymous write.
- **CSRF.** Next.js verifies the `Origin` header on every Server Action. A cross-origin
  POST is rejected before any handler runs. (Verified: see below.)
- **Validation** is Zod, generated from the same field definitions the form renders
  from, so client and server rules cannot drift. The client pass exists only for fast
  feedback; the server pass is the one that counts.
- **Uploads** are checked for size and MIME type, and filenames are sanitised.
- **The contact form** is rate limited per IP (fixed window, stored in Postgres so it
  survives restarts and works across instances) and carries a honeypot field. A bot
  that fills the honeypot receives a normal success response and nothing is stored.
- **Markdown** from the CMS is HTML-escaped *before* any tag is emitted, so even a
  compromised admin account cannot inject script into the public site.
- **The login page** rejects off-origin `callbackUrl` values, so it cannot be used as
  an open redirect.
- **No secrets reach the client.** All configuration is env vars.

---

## Deployment

### The one that bites first

Almost every failed deploy of this app is the same thing: **`DATABASE_URL` is not
set in the running container**, so Prisma aborts at startup with a schema
validation dump. Two rules:

1. Environment variables must be set **on the host or platform**, not in `.env`.
   `.env` is gitignored and excluded by `.dockerignore`, so it never reaches the
   image. That is deliberate: secrets do not belong in a build artifact.
2. `localhost` inside a container means **the container itself**. A database on
   your laptop, or in a sibling compose service, will not resolve. Use the
   service name (`db`) or the host your managed provider gives you.

The entrypoint checks both variables before doing anything and prints what is
missing and where to set it, so you get a sentence rather than a wasm trace.

### Required variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | Postgres URL the container can reach. Managed providers usually need `?sslmode=require`. |
| `AUTH_SECRET` | Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_URL` | Your public origin, for example `https://amritesh.dev` |
| `AUTH_TRUST_HOST` | `true` behind any proxy (Vercel, Nginx, Coolify, Railway, Fly) |
| `NEXT_PUBLIC_SITE_URL` | The same public origin |
| `STORAGE_DRIVER` | `s3` on any platform with an ephemeral filesystem |

First boot only: set `SEED_ON_START=true` plus `SEED_ADMIN_EMAIL` and
`SEED_ADMIN_PASSWORD` to create the admin account and load the content. **Turn
`SEED_ON_START` back off afterwards.** It is off by default so that a redeploy
cannot quietly resurrect content you deleted.

**Platform-specific walkthroughs for Railway and Vercel, with a full variable
matrix, are in [DEPLOYMENT.md](DEPLOYMENT.md).**

### Docker (recommended, works on any platform)

The repo ships a `Dockerfile`, a `.dockerignore` and `docker-compose.prod.yml`.
Most platforms (Coolify, Dokploy, Railway, Render, Fly) pick up the `Dockerfile`
automatically once it exists, instead of guessing at a build.

Whole stack on one host:

```bash
cp .env.example .env      # fill in POSTGRES_PASSWORD, AUTH_SECRET, AUTH_URL
docker compose -f docker-compose.prod.yml up -d --build
```

Image only, against a managed database:

```bash
docker build -t portfolio-cms .
docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require" \
  -e AUTH_SECRET="..." \
  -e AUTH_URL="https://your-domain" \
  -e AUTH_TRUST_HOST=true \
  -e NEXT_PUBLIC_SITE_URL="https://your-domain" \
  -v portfolio_uploads:/app/public/uploads \
  portfolio-cms
```

On boot the container validates the environment, runs `prisma migrate deploy`
(retrying for about 30 seconds while the database finishes starting), optionally
seeds, then starts the server. It exposes a `HEALTHCHECK` your platform can use.

Neither `prisma generate` nor `next build` needs a reachable database, so the
image builds with no database credentials at all. Only the runtime needs them.

### Without Docker

```bash
npm ci
npx prisma generate
npm run build
npx prisma migrate deploy   # needs DATABASE_URL
npm start
```

Make the start command run migrations before booting, otherwise a schema change
ships without its migration.

### Uploads

`STORAGE_DRIVER=local` writes to `public/uploads`, which is **ephemeral in a
container**. Either mount a volume on `/app/public/uploads` (the compose file
does this) or set `STORAGE_DRIVER=s3`. On Vercel and Fly machines, S3 is the
only correct option.

## What was verified, and how

224 automated checks were run against a live server and a live Postgres, driving the
**real** Server Actions over HTTP rather than calling functions directly.

| Area | Checks | Covers |
|---|---|---|
| Public reads | 53 | Every section renders from the DB; drafts stay hidden; project detail pages; per-project metadata; unknown slug returns a real 404; every admin route redirects anonymous visitors; login succeeds and fails correctly; open-redirect guard |
| CRUD | 42 | Create, publish, update, duplicate, reorder and delete a project through the actual admin actions; child rows (technologies, metrics, gallery) written and removed transactionally; edits appear on the public site; server-side validation rejects bad input; unique-slug collision returns a readable message; **anonymous callers rejected and nothing persisted**; contact form persists; honeypot drops bots; a settings edit reaches the public footer |
| Media, uploads, rate limiting | 32 | Upload writes bytes to disk and a row to Postgres and serves over HTTP; disallowed MIME types refused; path-traversal filenames flattened; oversized files refused by the app rather than the framework; anonymous and **cross-origin** uploads blocked; alt text; delete removes both row and bytes; the contact limiter blocks on the 6th submission and stores exactly 5 |
| Restart persistence | 3 | An edit made through the admin survives a full cold restart of both the Postgres container and the Next server |
| Resilience | 12 | Correct status codes with the database down (500 on pages, 503 on `/api/health`), the app recovers when the database returns without a restart, path traversal against the uploads route is refused with no leakage |
| Container deploy | 56 | Image builds with no database credentials; entrypoint refuses to start with a readable message when `DATABASE_URL` or `AUTH_SECRET` is missing; full compose stack migrates, seeds, serves and survives a restart; the whole 53-check read/auth suite passes against the containerised production build |
| Theme and redesign | 26 | Both light and dark modes render correctly and the mode/colour mismatch guard holds; boot screen, parallax and card surfaces are wired in; no em dashes in rendered output; skip link and section labelling present |

Two real bugs were found and fixed during this run, both worth knowing about:

1. **Soft 404 on unknown project slugs.** A `loading.tsx` placed above
   `/projects/[slug]` opened a Suspense boundary, which streams the shell and commits
   HTTP 200 before the page body runs. Unknown slugs rendered 404 *content* with a
   200 *status*, which search engines treat as a soft 404. Fixed by scoping the loading
   skeleton to the home route with a `(home)` route group, so it no longer sits above a
   route that must be able to answer 404.
2. **Unreachable upload limit.** Server Actions cap bodies at 1 MB by default, so the
   documented 5 MB limit was a lie and any file over 1 MB failed with an opaque
   framework error. Fixed by deriving `serverActions.bodySizeLimit` from
   `UPLOAD_MAX_BYTES`, with headroom so near-miss uploads get the app's own message.
3. **Uploaded files 404 in production.** Next builds its `public/` manifest at
   build time, so anything the CMS uploaded afterwards was never served by
   `next start`, even though the bytes were on disk and the row was in Postgres.
   Every CMS-uploaded image would have been broken on a real deploy. The dev
   server reads `public/` per request, which is why it never showed locally.
   Fixed with a route handler plus a rewrite; see [Storage](#storage).
4. **A database blip took the whole site down with an opaque 500.** The public
   layout read the database unguarded, and an error thrown in a layout bubbles
   past that segment error boundary. Fixed with error boundaries at the root,
   the public segment and the admin, plus chrome-safe readers so the header and
   footer degrade instead of failing the page. Added `/api/health`, which
   round-trips to Postgres, and pointed the container healthcheck at it: the old
   check hit a page that renders without the database, so it reported healthy
   while every public page returned 500.
5. **The home-page loading skeleton lied about status codes.** A `loading.tsx`
   opens a Suspense boundary, which flushes the shell and locks the response at
   200 before the page body runs. It produced a soft 404 on unknown project
   slugs, and later a 200 carrying a skeleton when the database was down.
   Removed: the page is server-rendered in tens of milliseconds, so the skeleton
   was buying a flash and costing correct status codes twice.

Not covered by automation: `replaceMedia` (it takes two arguments, one a `FormData`,
which the test harness could not encode; it is `storage.put` + `storage.delete` +
`prisma.update`, and all three are exercised elsewhere), and visual/responsive
rendering, which was not checked in a real browser.

---

## Decisions and assumptions

- **bcryptjs instead of Argon2.** Argon2 needs a native build, which is friction on
  Windows and in slim containers. bcrypt at cost 12 is appropriate for a
  single-operator admin. Swap it in `lib/auth.ts` and the seed if you want Argon2.
- **No AWS SDK.** Explained under [Storage](#storage).
- **`SiteSetting` is a key/value table.** Site settings, theme tokens and SEO fields
  are rows, not columns, so adding a setting is a seed line rather than a migration.
  The `group` column decides which admin screen renders it and `type` decides the input
  widget.
- **One `status` field, not a separate `published` boolean.** Appendix B listed both a
  `status` and a `published` flag on Project. Two sources of truth for one question
  invites them to disagree, so there is a single `ContentStatus`. The project's
  *lifecycle* badge (Live / In Development / Coming Soon) is a separate field, because
  a project can legitimately be publicly visible while still being built.
- **Rate limiting lives in Postgres**, not memory, so it survives restarts and works
  with more than one instance. Move it to Redis if the contact form ever gets hot.
- **Markdown is a small hand-written renderer**, not a library, because the subset
  portfolio prose needs is headings, bold, italic, code, links and lists, and escaping
  first is simpler to audit than sanitising after.
- **No stock photography.** Projects have no images yet. Rather than fill the cards
  with unrelated stock photos or fake screenshots, a missing thumbnail renders a
  typographic plate. Upload real screenshots in **Media** and set them on each project.

---

## Before you publish

The build brief flagged four facts as unconfirmed. Per that instruction, each is seeded
as **Draft**, so none of them is on the public site right now. Confirm and publish each
in the CMS.

| # | What | Where | State |
|---|---|---|---|
| 1 | **Inspie Leap location.** One source says Hyderabad; not confirmed. | Admin > Experience > Product Development Intern | Draft, `location` left blank |
| 2 | **"100+ employees using FleetZeno".** Include only if a source supports it. | Admin > Achievements | Draft. Also deliberately left out of the DOBR role's achievements list |
| 3 | **AK Engg Enterprise.** Appeared in the source list with no role, dates or description. | Not seeded at all | Add it in Admin > Experience when you have the details |
| 4 | **Contact email, phone, resume URL, social URLs.** | Admin > Profile, Admin > Social links, Admin > Site settings (`site.contactEmail`) | Placeholders. The three social links are Draft so no dead link is public |

Two more metrics are seeded as Draft because no source was given for them:
**40% API latency reduction** and **70% trip-planning time reduction**. Publish them
once you can point at where the numbers come from.

**One thing to decide.** Your Profile currently says you are working as *Product
Development Intern at Inspie Leap*, and that is published, because the brief gave the
employer and role as fact and only flagged the location. But the matching Experience
entry is Draft, so the hero mentions a job the Experience section does not list. Either
publish that Experience entry once you have confirmed the location, or clear
`currentlyWorkingAt` and `currentlyWorkingRole` in Profile until you do.

Finally: **change the admin password** from whatever you seeded, and upload real
project screenshots in **Media**.
