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
        <p className="text-sm text-neutral-600">Active and inactive goals.</p>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <ul className="divide-y divide-neutral-200 border border-neutral-300">
        {goals.length === 0 ? (
          <li className="px-3 py-4 text-sm text-neutral-500">No goals yet.</li>
        ) : (
          goals.map((g) => (
            <li key={g.id} className="px-3 py-3 text-sm">
              <div className="font-medium">{g.title}</div>
              <div className="text-neutral-500">
                {g.active ? "active" : "inactive"}
              </div>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
