-- Move the stored theme to the violet river palette.
-- Only rows still holding the old seeded defaults change, so a colour that was
-- deliberately picked in Admin > Theme is left alone.
UPDATE "site_settings" SET "value" = '#b18cff', "updatedAt" = NOW() WHERE "key" = 'theme.accent'     AND lower("value") = '#ff2a2a';
UPDATE "site_settings" SET "value" = '#0d0718', "updatedAt" = NOW() WHERE "key" = 'theme.background' AND lower("value") = '#060607';
UPDATE "site_settings" SET "value" = '#170d2b', "updatedAt" = NOW() WHERE "key" = 'theme.surface'    AND lower("value") = '#0e0e11';
UPDATE "site_settings" SET "value" = '#efe7ff', "updatedAt" = NOW() WHERE "key" = 'theme.foreground' AND lower("value") = '#f5f5f7';
UPDATE "site_settings" SET "value" = '#a898c8', "updatedAt" = NOW() WHERE "key" = 'theme.muted'      AND lower("value") = '#86868b';
