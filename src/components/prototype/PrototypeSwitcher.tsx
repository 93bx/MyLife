"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

type VariantMeta = { key: string; name: string };

export function PrototypeSwitcher({
  variants,
  param = "variant",
}: {
  variants: VariantMeta[];
  param?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentKey = searchParams.get(param) ?? variants[0]?.key ?? "A";
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === currentKey),
  );
  const current = variants[index] ?? variants[0];
  const query = searchParams.toString();

  function go(nextIndex: number) {
    const v = variants[(nextIndex + variants.length) % variants.length];
    if (!v) return;
    const next = new URLSearchParams(query);
    next.set(param, v.key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const delta = e.key === "ArrowLeft" ? -1 : 1;
      const v =
        variants[(index + delta + variants.length) % variants.length];
      if (!v) return;
      const next = new URLSearchParams(query);
      next.set(param, v.key);
      router.replace(`${pathname}?${next.toString()}`);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, pathname, query, param, variants, router]);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-sm border border-warning bg-bg-elevated px-2 py-1.5 shadow-lg"
      role="group"
      aria-label="Prototype variant switcher"
    >
      <button
        type="button"
        aria-label="Previous variant"
        onClick={() => go(index - 1)}
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm text-text hover:bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        ←
      </button>
      <span className="min-w-[10rem] text-center font-mono text-xs text-warning">
        {current?.key} — {current?.name}
      </span>
      <button
        type="button"
        aria-label="Next variant"
        onClick={() => go(index + 1)}
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm text-text hover:bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        →
      </button>
    </div>
  );
}
