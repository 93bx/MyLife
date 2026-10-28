"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PrototypeSwitcher } from "@/components/prototype/PrototypeSwitcher";
import { VariantA, VariantB, VariantC } from "./variants";

const VARIANTS = [
  { key: "A", name: "Attention ribbon" },
  { key: "B", name: "Two-rail cockpit" },
  { key: "C", name: "Timeline-first" },
] as const;

function DashboardPrototypeInner() {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "A";

  return (
    <>
      {/* PROTOTYPE — answers: which Dashboard layout feels right? */}
      {variant === "B" ? (
        <VariantB />
      ) : variant === "C" ? (
        <VariantC />
      ) : (
        <VariantA />
      )}
      <PrototypeSwitcher variants={[...VARIANTS]} />
    </>
  );
}

export default function DashboardPrototypePage() {
  return (
    <Suspense
      fallback={
        <p className="text-text-muted">Loading dashboard prototype…</p>
      }
    >
      <DashboardPrototypeInner />
    </Suspense>
  );
}
