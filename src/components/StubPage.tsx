import { HubHeader } from "./HubHeader";

export function StubPage({
  title,
  purpose,
}: {
  title: string;
  purpose: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <HubHeader title={title} description={purpose} />
      <p className="text-sm text-text-muted">Not built yet.</p>
    </div>
  );
}
