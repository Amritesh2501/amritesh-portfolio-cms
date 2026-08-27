import { SettingsScreen } from "../_settings-screen";

export const dynamic = "force-dynamic";

export default function SiteSettingsPage() {
  return (
    <SettingsScreen
      group="site"
      title="Site settings"
      description="Titles, footer copy, contact details and the boot intro. These strings render on every page."
    />
  );
}
