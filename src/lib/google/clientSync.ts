import { apiJson } from "@/lib/apiClient";

/** Fire-and-forget pull/push when a Google account is connected. */
export async function syncGoogleCalendarIfConnected(): Promise<void> {
  const status = await apiJson<{ connected: boolean }>("/api/google/calendars");
  if (!status.ok || !status.data.connected) {
    return;
  }
  await apiJson("/api/google/calendar/sync", { method: "POST" });
}
