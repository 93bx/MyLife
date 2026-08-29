"use client";

import { useCallback, useEffect, useState } from "react";
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

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-text-muted">
          Delivery and opportunity projects.
        </p>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-border border border-border">
        {projects.length === 0 ? (
          <li className="px-3 py-4 text-sm text-text-muted">
            None yet — create when ready
          </li>
        ) : (
          projects.map((p) => (
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
