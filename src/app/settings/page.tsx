import { WorkspaceHeader } from "@/components/workspace-header";
import { ApiKeySettings } from "@/components/settings/api-key-settings";

export default function SettingsPage() {
  return <main className="min-h-dvh"><WorkspaceHeader /><section className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
    <p className="text-sm text-muted-foreground">个人偏好</p>
    <h1 className="mt-3 font-serif text-4xl font-semibold">设置</h1>
    <div className="mt-8"><ApiKeySettings /></div>
  </section></main>;
}
