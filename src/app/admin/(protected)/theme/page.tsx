import { SettingsScreen } from "../_settings-screen";

export const dynamic = "force-dynamic";

export default function ThemePage() {
  return (
    <SettingsScreen
      group="theme"
      title="Theme"
      description="Colour tokens and surface effects. Saved values are written onto the document root, so the whole site repaints without a rebuild."
    />
  );
}
