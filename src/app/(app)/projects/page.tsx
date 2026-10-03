"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import { isFreelanceDeliveryProject } from "@/domain/hubFilters";
import { apiJson } from "@/lib/apiClient";

type ProjectRow = {
  id: string;
  title: string;
  kind: string;
  origin: string;
  opportunitySubtype: string | null;
  stage: string;
  examDate: string | null;
  passed: boolean | null;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiJson<{ projects: ProjectRow[] }>("/api/projects");
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setProjects(res.data.projects);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const freelance = useMemo(
    () => projects.filter(isFreelanceDeliveryProject),
    [projects],
  );

  return (
    <main className="space-y-6">
      <HubHeader
        title="Projects"
        description="Freelance delivery projects (personal or hustle)."
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-border border border-border">
        {freelance.length === 0 ? (
          <li className="px-3 py-4 text-sm text-text-muted">
            No freelance projects yet
          </li>
        ) : (
          freelance.map((p) => (
            <li key={p.id} className="px-3 py-3 text-sm">
              <div className="font-medium">{p.title}</div>
              <div className="text-text-muted">
                {p.kind} · {p.origin} · stage {p.stage}
                {p.opportunitySubtype ? ` · ${p.opportunitySubtype}` : ""}
              </div>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
