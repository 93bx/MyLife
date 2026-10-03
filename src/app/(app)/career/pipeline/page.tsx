"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import { isOpportunityProject } from "@/domain/hubFilters";
import { apiJson } from "@/lib/apiClient";

type ProjectRow = {
  id: string;
  title: string;
  kind: string;
  origin: string;
  stage: string;
};

export default function CareerPipelinePage() {
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

  const opportunities = useMemo(
    () =>
      projects.filter((p) =>
        isOpportunityProject({ kind: p.kind, origin: p.origin }),
      ),
    [projects],
  );

  return (
    <div className="flex flex-col gap-4">
      <HubHeader
        title="Pipeline"
        description="Opportunity projects with current stage."
      />
      {loadError ? (
        <p className="text-sm text-danger">Load error: {loadError}</p>
      ) : null}
      {opportunities.length === 0 ? (
        <p className="text-sm text-text-muted">No opportunity projects yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {opportunities.map((p) => (
            <li key={p.id} className="flex flex-wrap gap-x-2">
              <span className="font-medium">{p.title}</span>
              <span className="text-text-muted">{p.stage}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
