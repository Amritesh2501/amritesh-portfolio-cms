# Deployment

Step by step for Railway and Vercel, with exactly which variable goes where.

**Short version:** Railway is the better fit for this app. It runs the
`Dockerfile`, runs migrations at boot, and can host the database and a
persistent uploads volume in the same project. Vercel works too, but it is
serverless, so uploads must go to S3 and migrations have to move into the build.

---

## Table of contents

1. [Why the deploy is failing right now](#why-the-deploy-is-failing-right-now)
2. [Variable reference](#variable-reference)
3. [Railway, step by step](#railway-step-by-step)
4. [Vercel, step by step](#vercel-step-by-step)
5. [After the first deploy](#after-the-first-deploy)
6. [Troubleshooting](#troubleshooting)

---

## Why the deploy is failing right now

The logs show two different problems, and they are not the same problem:

```
error: Environment variable not found: DATABASE_URL.
```

The variable is not present at all. This is the crash loop: something is running
a Prisma command with no database configuration.

```
error: ... `DATABASE_URL` resolved to an empty string.
```

The variable exists but is blank. A variable defined with no value is not the
same as an unset one, and Prisma rejects both.

There is a third line worth ignoring:

```
✓ Generating static pages (5/5)
```

The build **succeeded**. The datasource complaint printed during page generation
comes from the 404 page reading site settings, which is wrapped in a `try/catch`
precisely so a build without a database still works. That message is noise.

So: set `DATABASE_URL` in the environment your app **runs** in, not only the one
it builds in. Most platforms keep those separate, and that is the usual cause.

---

## Variable reference

### Required everywhere

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | The URL the app queries through. Managed providers usually need `?sslmode=require`. |
| `DIRECT_URL` | Same as `DATABASE_URL`, unless you use a pooler | Migrations only. See below. |
| `AUTH_SECRET` | 32 random bytes, base64 | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_URL` | `https://your-domain` | Your public origin. No trailing slash. |
| `AUTH_TRUST_HOST` | `true` | Required behind any proxy, which includes both platforms. |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` | Same origin. Used for canonical and OG tags. |

### About `DIRECT_URL`

Migrations cannot run through a transaction-mode connection pooler, because they
need session-level statements the pooler will not carry.

- **No pooler** (Railway Postgres, plain RDS): set `DIRECT_URL` to exactly the
  same string as `DATABASE_URL`. On Railway you can skip it entirely, because
  the Docker entrypoint defaults it for you.
- **Neon**: `DATABASE_URL` is the `-pooler` host, `DIRECT_URL` is the same host
  with `-pooler` removed.
- **Supabase**: `DATABASE_URL` is port `6543` (transaction pooler),
  `DIRECT_URL` is port `5432` (direct).

### First deploy only

| Variable | Value |
|---|---|
| `SEED_ON_START` | `true` on Railway for the first boot, then remove it |
| `SEED_ADMIN_EMAIL` | The email you will sign in to `/admin` with |
| `SEED_ADMIN_PASSWORD` | At least 8 characters. Change it after first login. |
| `SEED_ADMIN_NAME` | Your display name |

### Uploads

| Variable | Railway | Vercel |
|---|---|---|
| `STORAGE_DRIVER` | `local` with a volume, or `s3` | **`s3`, required** |
| `S3_ENDPOINT` | only if s3 | `https://<account>.r2.cloudflarestorage.com` or your S3 endpoint |
| `S3_REGION` | only if s3 | `auto` for R2, otherwise the bucket region |
| `S3_BUCKET` | only if s3 | bucket name |
| `S3_ACCESS_KEY_ID` | only if s3 | |
| `S3_SECRET_ACCESS_KEY` | only if s3 | |
| `S3_PUBLIC_BASE_URL` | only if s3 | The public URL the bucket serves from |
| `S3_FORCE_PATH_STYLE` | only if s3 | `true` for R2 and MinIO, `false` for AWS |

Vercel has a read-only filesystem, so `STORAGE_DRIVER=local` cannot work there.
The app will tell you so in plain language if you try it.

### Optional

| Variable | Default | Purpose |
|---|---|---|
| `UPLOAD_MAX_BYTES` | `5242880` | Max upload size. Restart after changing: it is read at boot. |
| `CONTACT_RATE_LIMIT` | `5` | Contact submissions per window per IP |
| `CONTACT_RATE_WINDOW_SECONDS` | `3600` | Window length |

---

## Railway, step by step

### 1. Create the project and the database

1. **New Project** then **Deploy PostgreSQL**. Wait for it to provision.
2. **New** then **GitHub Repo**, and pick this repository.

Railway sees the `Dockerfile` and uses it. No build configuration needed.

### 2. Set the app service variables

Open the **app** service (not the Postgres one), go to **Variables**, and add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `AUTH_SECRET` | your generated secret |
| `AUTH_TRUST_HOST` | `true` |
| `SEED_ON_START` | `true` |
| `SEED_ADMIN_EMAIL` | your email |
| `SEED_ADMIN_PASSWORD` | a strong password |
| `SEED_ADMIN_NAME` | your name |

`${{Postgres.DATABASE_URL}}` is a **reference**, typed literally. Railway
resolves it to the private URL, which keeps traffic inside the project and off
your egress bill. If your Postgres service is named something other than
`Postgres`, use that name.

Do not set `DIRECT_URL`. Railway Postgres has no pooler, and the entrypoint
copies `DATABASE_URL` into it automatically.

### 3. Get a domain, then set the URL variables

Under **Settings** then **Networking**, click **Generate Domain**. You now have
something like `portfolio-production-1234.up.railway.app`.

Add two more variables using that domain:

| Variable | Value |
|---|---|
| `AUTH_URL` | `https://portfolio-production-1234.up.railway.app` |
| `NEXT_PUBLIC_SITE_URL` | `https://portfolio-production-1234.up.railway.app` |

This is a chicken-and-egg step: you cannot know the domain until Railway makes
one. The first deploy will run fine without these; redeploy after adding them.

### 4. Add a volume for uploads

Under the app service, **Settings** then **Volumes**, mount a volume at:

```
/app/public/uploads
```

Leave `STORAGE_DRIVER` unset (it defaults to `local`). Without this volume every
uploaded image disappears on the next deploy.

Prefer S3 instead? Set `STORAGE_DRIVER=s3` and the `S3_*` variables, and skip the
volume.

### 5. Health check

**Settings** then **Deploy**, set **Health Check Path** to:

```
/api/health
```

That endpoint round-trips to Postgres, so Railway will not route traffic to an
instance that cannot reach its database.

### 6. Deploy, then turn seeding off

Deploy. The logs should read:

```
> applying migrations
> seeding
> starting server
```

Sign in at `https://your-domain/admin/login` with the seed credentials. Then
**delete `SEED_ON_START`** (or set it to `false`) and redeploy. Leaving it on
means every deploy re-runs the seed and restores content you deleted.

---

## Vercel, step by step

Vercel does not use the `Dockerfile`. It runs a serverless build, which changes
three things: migrations move into the build, uploads must go to S3, and the
database connection should be pooled.

### 1. Provision a database

Vercel does not host Postgres itself. Use **Neon** (integrates cleanly), or
Supabase, or keep the database on Railway and point Vercel at its **public**
URL.

From Neon you get two strings. Keep both:

- pooled, hostname contains `-pooler` → `DATABASE_URL`
- direct, no `-pooler` → `DIRECT_URL`

### 2. Import the repo

**Add New** then **Project**, import the repository. Framework preset: Next.js.
Leave the build command alone.

The repo defines a `vercel-build` script, and Vercel runs that automatically
when it exists:

```
prisma generate && prisma migrate deploy && next build
```

That is what applies your migrations. Vercel has no container start hook, so
this is the only place migrations can run automatically. `migrate deploy` is
idempotent, so running it on every deploy is fine.

### 3. Set the environment variables

**Settings** then **Environment Variables**. Add each one to **Production**,
**Preview** and **Development** unless noted.

| Variable | Value |
|---|---|
| `DATABASE_URL` | the **pooled** connection string |
| `DIRECT_URL` | the **direct** connection string |
| `AUTH_SECRET` | your generated secret |
| `AUTH_URL` | `https://your-project.vercel.app` |
| `AUTH_TRUST_HOST` | `true` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-project.vercel.app` |
| `STORAGE_DRIVER` | `s3` |
| `S3_ENDPOINT` | your endpoint |
| `S3_REGION` | `auto` for R2, else the region |
| `S3_BUCKET` | bucket name |
| `S3_ACCESS_KEY_ID` | key id |
| `S3_SECRET_ACCESS_KEY` | secret |
| `S3_PUBLIC_BASE_URL` | public base URL of the bucket |
| `S3_FORCE_PATH_STYLE` | `true` for R2, `false` for AWS |

Do **not** set `SEED_ON_START` on Vercel. There is no boot hook, so it does
nothing. Seed from your machine instead, see the next step.

### 4. Seed once, from your machine

Vercel cannot run the seed for you. Point your local machine at the production
database and run it once:

```bash
DATABASE_URL="<production pooled url>" \
DIRECT_URL="<production direct url>" \
SEED_ADMIN_EMAIL="you@example.com" \
SEED_ADMIN_PASSWORD="a-strong-password" \
npm run db:seed
```

On Windows PowerShell:

```powershell
$env:DATABASE_URL="<production pooled url>"
$env:DIRECT_URL="<production direct url>"
$env:SEED_ADMIN_EMAIL="you@example.com"
$env:SEED_ADMIN_PASSWORD="a-strong-password"
npm run db:seed
```

### 5. Bucket must allow public reads

The app stores the resolved public URL of each upload, and browsers fetch it
directly. If the bucket is private, every image 404s or 403s. Give the bucket
public read access on objects, or put a CDN in front of it and use that as
`S3_PUBLIC_BASE_URL`.

### 6. A caveat worth knowing

Every serverless function opens its own database connection. That is why
`DATABASE_URL` must be the pooled string. Point it at an unpooled database and
you will hit connection limits under any real traffic, with errors that look
random rather than like a configuration problem.

---

## After the first deploy

1. **Sign in** at `/admin/login` and change the seeded password.
2. **Turn off `SEED_ON_START`** (Railway only) and redeploy.
3. **Publish the drafts.** Several entries ship as Draft on purpose because the
   underlying facts were unconfirmed. See *Before you publish* in the README.
4. **Set real values** for contact email, resume URL and social links in
   Admin > Profile, Admin > Social links and Admin > Site settings.
5. **Upload project images** in Admin > Media and attach them to each project.
6. **Check `/api/health`** returns `{"status":"ok","database":"up"}`.

---

## Troubleshooting

**`Environment variable not found: DATABASE_URL`**
The variable is missing in the environment that step runs in. On Vercel, check
it is enabled for the environment you deployed (Production vs Preview). On
Railway, check it is on the **app** service, not the Postgres service.

**`DATABASE_URL resolved to an empty string`**
The variable exists with no value. Delete and re-add it. Watch for a trailing
newline pasted in from a terminal.

**`Can't reach database server`**
The value is set but wrong or unreachable. Inside a container, `localhost` means
the container itself, never your laptop or a sibling service. Use the private
hostname or the provider's host. Managed providers usually need
`?sslmode=require`.

**Migrations fail with a pooler error, or hang**
`DIRECT_URL` is pointing at the pooled URL. It has to be the direct one.

**Uploaded images 404**
On Vercel: `STORAGE_DRIVER` is not `s3`, or the bucket is not publicly readable.
On Railway: no volume is mounted at `/app/public/uploads`.

**Admin login redirects back to the login page**
`AUTH_URL` does not match the origin you are actually browsing, or
`AUTH_TRUST_HOST` is not `true`. Both platforms sit behind a proxy, so it must
be set.

**Everything 500s but `/admin/login` works**
That signature means the database is unreachable: the login page is the only one
that renders without a query. Check `/api/health`.

**`package.json#prisma is deprecated`**
Cosmetic. It is a warning about a Prisma 7 change, not a failure, and nothing
here depends on fixing it today.
