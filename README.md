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
4. [Architecture](#architecture)
5. [Adding a new content type](#adding-a-new-content-type)
6. [Storage](#storage)
7. [Security model](#security-model)
8. [Deployment](#deployment)
9. [What was verified, and how](#what-was-verified-and-how)
10. [Decisions and assumptions](#decisions-and-assumptions)
11. [Before you publish](#before-you-publish)

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
| Colours, scanlines, film grain, light/dark | **Theme** | Values are written onto the document root as CSS variables, so the whole site repaints with no rebuild. |
| Page title, meta description, keywords, OG image, favicon, robots | **SEO** | Project pages generate their own metadata from the project record. |
| Upload, replace, describe, delete images and PDFs | **Media** | Every image field has a **Library** button that picks from here. **Copy URL** gives you the path to paste anywhere. |
| Read and delete contact submissions | **Messages** | Unread count shows in the sidebar. Reply opens your mail client. |

**Publish states.** Every content type is `Draft`, `Published` or `Archived`. The public
site queries only `Published`. Drafts are invisible to visitors, and a draft project's
detail page returns a real 404, not a blank page.

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

**`local`** (default) writes to `public/uploads/` and Next serves the files statically.
Good for development and single-server deploys. It does **not** survive an ephemeral
filesystem, so do not use it on Vercel or Fly machines.

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

1. Provision Postgres (Neon, Supabase, RDS, Railway) and set `DATABASE_URL`.
2. Set `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST=true`, `NEXT_PUBLIC_SITE_URL`.
3. Set `STORAGE_DRIVER=s3` and the `S3_*` variables. **Do not use the local driver on
   a platform with an ephemeral filesystem** or uploads disappear on every deploy.
4. `npm run build`
5. `npx prisma migrate deploy` against the production database.
6. Seed **once**, with a strong `SEED_ADMIN_PASSWORD`, then change it or remove the
   seed variables. The seed refuses to run in production with the placeholder password.
7. `npm start`

Every page is server-rendered on demand (`force-dynamic`) so admin edits appear
immediately. If you later want caching, replace `force-dynamic` with tag-based
revalidation; the write actions already call `revalidatePath("/", "layout")`.

---

## What was verified, and how

130 automated checks were run against a live server and a live Postgres, driving the
**real** Server Actions over HTTP rather than calling functions directly.

| Area | Checks | Covers |
|---|---|---|
| Public reads | 53 | Every section renders from the DB; drafts stay hidden; project detail pages; per-project metadata; unknown slug returns a real 404; every admin route redirects anonymous visitors; login succeeds and fails correctly; open-redirect guard |
| CRUD | 42 | Create, publish, update, duplicate, reorder and delete a project through the actual admin actions; child rows (technologies, metrics, gallery) written and removed transactionally; edits appear on the public site; server-side validation rejects bad input; unique-slug collision returns a readable message; **anonymous callers rejected and nothing persisted**; contact form persists; honeypot drops bots; a settings edit reaches the public footer |
| Media, uploads, rate limiting | 32 | Upload writes bytes to disk and a row to Postgres and serves over HTTP; disallowed MIME types refused; path-traversal filenames flattened; oversized files refused by the app rather than the framework; anonymous and **cross-origin** uploads blocked; alt text; delete removes both row and bytes; the contact limiter blocks on the 6th submission and stores exactly 5 |
| Restart persistence | 3 | An edit made through the admin survives a full cold restart of both the Postgres container and the Next server |

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
