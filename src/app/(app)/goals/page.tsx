"use client";

import { useCallback, useEffect, useState } from "react";
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

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="text-sm text-text-muted">Active and inactive goals.</p>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-border border border-border">
        {goals.length === 0 ? (
          <li className="px-3 py-4 text-sm text-text-muted">
            None yet — create when ready
          </li>
        ) : (
          goals.map((g) => (
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
