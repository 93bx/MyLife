"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import {
  NAV_HUBS,
  findHubForPathname,
  hubDefaultPath,
  type NavHub,
} from "@/lib/nav/config";

const EXPANDED_KEY = "mylife.nav.expanded";

function readExpandedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EXPANDED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function isPathActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavTree({
  pathname,
  expanded,
  onToggle,
  onNavigate,
}: {
  pathname: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5 px-2" aria-label="Main">
      {NAV_HUBS.map((hub) => (
        <HubItem
          key={hub.id}
          hub={hub}
          pathname={pathname}
          expanded={expanded.has(hub.id)}
          onToggle={() => onToggle(hub.id)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function HubItem({
  hub,
  pathname,
  expanded,
  onToggle,
  onNavigate,
}: {
  hub: NavHub;
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const hasChildren = Boolean(hub.children?.length);
  const defaultPath = hubDefaultPath(hub.href);
  const hubActive = isPathActive(pathname, hub.href);

  if (!hasChildren) {
    return (
      <Link
        href={hub.href}
        onClick={onNavigate}
        className={`flex items-center gap-2 rounded-sm border-l-2 px-2 py-1.5 text-sm transition-colors ${
          hubActive
            ? "border-accent bg-accent-muted/30 text-accent"
            : "border-transparent text-text-muted hover:bg-bg-elevated hover:text-text"
        }`}
      >
        <Icon name={hub.icon} className="size-4 shrink-0" aria-hidden />
        <span>{hub.label}</span>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div
        className={`flex items-center gap-0.5 rounded-sm border-l-2 ${
          hubActive
            ? "border-accent/50 text-text"
            : "border-transparent text-text-muted"
        }`}
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${hub.label}`}
          onClick={onToggle}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm hover:bg-bg-elevated hover:text-text"
        >
          {expanded ? (
            <ChevronDown className="size-3.5" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5" aria-hidden />
          )}
        </button>
        {defaultPath ? (
          <Link
            href={defaultPath}
            onClick={onNavigate}
            title={`Open ${hub.label}`}
            aria-label={`Open ${hub.label}`}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm hover:bg-bg-elevated hover:text-accent"
          >
            <Icon name={hub.icon} className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className="inline-flex size-7 shrink-0 items-center justify-center">
            <Icon name={hub.icon} className="size-4" aria-hidden />
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 truncate rounded-sm px-1 py-1.5 text-left text-sm hover:bg-bg-elevated hover:text-text"
        >
          {hub.label}
        </button>
      </div>
      {expanded && hub.children ? (
        <div className="ml-4 flex flex-col gap-0.5 border-l border-border pl-1">
          {hub.children.map((child) => {
            const href = `${hub.href}/${child.segment}`;
            const active = isPathActive(pathname, href);
            return (
              <Link
                key={child.segment}
                href={href}
                onClick={onNavigate}
                className={`flex items-center gap-2 rounded-sm border-l-2 px-2 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-accent bg-accent-muted/30 text-accent"
                    : "border-transparent text-text-muted hover:bg-bg-elevated hover:text-text"
                }`}
              >
                <Icon name={child.icon} className="size-3.5 shrink-0" aria-hidden />
                <span>{child.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setExpanded(new Set(readExpandedIds()));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const hub = findHubForPathname(pathname);
    if (!hub?.children?.length) return;
    setExpanded((prev) => {
      if (prev.has(hub.id)) return prev;
      const next = new Set(prev);
      next.add(hub.id);
      return next;
    });
  }, [pathname, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...expanded]));
  }, [expanded, ready]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function toggleHub(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const tree = (
    <NavTree
      pathname={pathname}
      expanded={expanded}
      onToggle={toggleHub}
    />
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-sidebar-bg md:flex">
        <div className="border-b border-border px-4 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-text">
            MyLife
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-3">{tree}</div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-sidebar-bg px-3 md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-text-muted hover:bg-bg-elevated hover:text-text"
        >
          <span className="sr-only">Open menu</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <Link href="/" className="text-base font-semibold tracking-tight text-text">
          MyLife
        </Link>
      </header>

      {/* Mobile drawer + backdrop */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-bg/70 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-60 max-w-[85vw] flex-col border-r border-border bg-sidebar-bg transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="text-lg font-semibold tracking-tight text-text"
            >
              MyLife
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-muted hover:bg-bg-elevated hover:text-text"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-3">
            <NavTree
              pathname={pathname}
              expanded={expanded}
              onToggle={toggleHub}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </aside>
      </div>
    </>
  );
}
