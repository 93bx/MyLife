"use client";

import { useCallback, useEffect, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import { apiJson } from "@/lib/apiClient";

type GoalRow = {
  id: string;
  title: string;
  active: boolean;
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiJson<{ goals: GoalRow[] }>("/api/goals");
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setGoals(res.data.goals);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // No parked column in schema — list all goals as the active set.
  const activeGoals = goals;

  return (
    <main className="space-y-6">
      <HubHeader title="Goals" description="Active goals." />
      <p className="text-sm text-text-muted">Parked filter comes later</p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-border border border-border">
        {activeGoals.length === 0 ? (
          <li className="px-3 py-4 text-sm text-text-muted">
            None yet — create when ready
          </li>
        ) : (
          activeGoals.map((g) => (
            <li key={g.id} className="px-3 py-3 text-sm">
              <div className="font-medium">{g.title}</div>
              <div className="text-text-muted">
                {g.active ? "active" : "inactive"}
              </div>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
