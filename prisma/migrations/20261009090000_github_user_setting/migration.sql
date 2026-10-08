-- The "GitHub username" setting, for databases seeded before it existed.
--
-- The seed does not run on deploy, so a database created earlier never got
-- this row: the Settings screen had no field for it and the contribution
-- calendar and dev log stayed off. Empty here; the site falls back to the
-- GitHub link in Social links until a username is entered.
INSERT INTO "site_settings" ("key", "value", "group", "label", "description", "type", "displayOrder", "updatedAt")
VALUES (
  'site.githubUser',
  '',
  'site',
  'GitHub username',
  'Drives the contribution calendar and the dev log. Empty uses the GitHub link from Social links.',
  'text',
  10,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
