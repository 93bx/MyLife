"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import { isSmsDeliveryProject } from "@/domain/hubFilters";
import { apiJson } from "@/lib/apiClient";

type ProjectRow = {
  id: string;
  title: string;
  kind: string;
  origin: string;
  stage: string;
};

export default function CareerSmsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await apiJson<{ projects: ProjectRow[] }>("/api/projects");
    if (!res.ok) {
      setLoadError(res.error);
      return;
    }
    setProjects(res.data.projects);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const smsProjects = useMemo(
    () =>
      projects.filter((p) =>
        isSmsDeliveryProject({ kind: p.kind, origin: p.origin }),
      ),
    [projects],
  );

  return (
    <div className="flex flex-col gap-4">
      <HubHeader
        title="SMS"
        description="SMS delivery projects (kind delivery, origin sms)."
      />
      {loadError ? (
        <p className="text-sm text-danger">Load error: {loadError}</p>
      ) : null}
      {smsProjects.length === 0 ? (
        <p className="text-sm text-text-muted">No SMS delivery projects yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {smsProjects.map((p) => (
            <li key={p.id} className="font-medium">
              {p.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
