/**
 * Applies migrations during a platform build (Vercel and anything else without
 * a container start hook).
 *
 * It exists for one reason: `DIRECT_URL` is referenced by the schema, so Prisma
 * refuses to run migrations when it is unset, even though most databases have
 * no connection pooler and the two URLs are identical. The Docker entrypoint
 * already defaults it; this does the same for build-time migrations, so a
 * non-pooled setup needs exactly one database variable.
 *
 * Failing here is deliberate. A build that cannot migrate must not ship: the
 * alternative is a deploy that looks green and 500s on every page.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

// npm scripts do not load .env, but the Prisma CLI does, so without this the
// check below would fail locally while passing on a platform. Load it here so
// a local `npm run vercel-build` behaves exactly like the real build. On a
// platform there is no .env file and the variables come from the environment.
try {
  process.loadEnvFile();
} catch {
  // No .env. Normal in CI and in a container.
}

function fail(message) {
  console.error(`\n${"=".repeat(62)}\n MIGRATION STEP FAILED\n${"=".repeat(62)}`);
  console.error(message);
  console.error(`${"=".repeat(62)}\n`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  fail(
    ` DATABASE_URL is not set in the BUILD environment.\n\n` +
      ` Migrations run during the build on platforms with no start hook, so the\n` +
      ` variable has to be available to the build, not only at runtime.\n\n` +
      ` Vercel: Settings > Environment Variables, and make sure the variable is\n` +
      ` enabled for the environment you are deploying (Production, Preview or\n` +
      ` Development). A variable scoped to Production only is invisible to a\n` +
      ` Preview build.\n\n` +
      ` Managed providers usually also need ?sslmode=require on the end.`,
  );
}

if (!process.env.DATABASE_URL.trim()) {
  fail(
    ` DATABASE_URL is set but empty.\n\n` +
      ` A variable defined with a blank value is not the same as an unset one.\n` +
      ` Delete it and add it again, watching for a stray newline or quote.`,
  );
}

if (!process.env.DIRECT_URL) {
  // No pooler in play: the direct URL is simply the same connection.
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  console.log("> DIRECT_URL not set, defaulting it to DATABASE_URL");
}

// Resolve the Prisma CLI entry point and run it with the current node binary.
// Spawning through a shell would work too, but it triggers a Node deprecation
// warning and drags shell quoting rules into a build log for no benefit.
const require = createRequire(import.meta.url);
const prismaPackageJson = require.resolve("prisma/package.json");
const prismaBin = JSON.parse(fs.readFileSync(prismaPackageJson, "utf8")).bin;
const cli = path.join(
  path.dirname(prismaPackageJson),
  typeof prismaBin === "string" ? prismaBin : prismaBin.prisma,
);

console.log("> applying migrations");
const result = spawnSync(process.execPath, [cli, "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  fail(
    ` prisma migrate deploy exited with code ${result.status}.\n\n` +
      ` Common causes:\n` +
      `  - DATABASE_URL points somewhere unreachable from the build machine\n` +
      `  - the database requires SSL and ?sslmode=require is missing\n` +
      `  - DIRECT_URL points at a pooled URL. Migrations need the direct one:\n` +
      `      Neon      drop "-pooler" from the host\n` +
      `      Supabase  port 5432, not 6543`,
  );
}
