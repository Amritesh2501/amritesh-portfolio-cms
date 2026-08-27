import { SettingsScreen } from "../_settings-screen";

export const dynamic = "force-dynamic";

export default function SeoPage() {
  return (
    <SettingsScreen
      group="seo"
      title="SEO"
      description="Page title, meta description, keywords, social cards and indexing. Project pages generate their own metadata from the project record."
    />
  );
}
