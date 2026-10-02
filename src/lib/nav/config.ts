export type NavChild = { segment: string; label: string; icon: string };

export type NavHub = {
  id: string;
  href: string;
  label: string;
  icon: string;
  defaultChild?: string;
  children?: NavChild[];
};

export const NAV_HUBS: NavHub[] = [
  {
    id: "dashboard",
    href: "/",
    label: "Dashboard",
    icon: "LayoutDashboard",
  },
  {
    id: "time",
    href: "/time",
    label: "Time",
    icon: "Clock",
    defaultChild: "plan",
    children: [
      { segment: "plan", label: "Plan", icon: "CalendarRange" },
      { segment: "calendar", label: "Calendar", icon: "Calendar" },
      { segment: "tasks", label: "Tasks", icon: "ListTodo" },
      { segment: "capacity", label: "Capacity", icon: "Gauge" },
      { segment: "focus", label: "Focus", icon: "Focus" },
      { segment: "trail", label: "Trail", icon: "Route" },
    ],
  },
  {
    id: "money",
    href: "/money",
    label: "Money",
    icon: "Wallet",
    defaultChild: "stats",
    children: [
      { segment: "stats", label: "Stats", icon: "BarChart3" },
      { segment: "tasks", label: "Tasks", icon: "ListTodo" },
      { segment: "ledger", label: "Ledger", icon: "BookOpen" },
      { segment: "obligations", label: "Obligations", icon: "Receipt" },
      { segment: "cash-ping", label: "Cash ping", icon: "Banknote" },
      { segment: "coming-due", label: "Coming due", icon: "AlarmClock" },
    ],
  },
  {
    id: "career",
    href: "/career",
    label: "Career",
    icon: "Briefcase",
    defaultChild: "profile",
    children: [
      { segment: "profile", label: "Profile", icon: "UserRound" },
      { segment: "sms", label: "SMS", icon: "MessageSquare" },
      { segment: "pipeline", label: "Pipeline", icon: "Kanban" },
      { segment: "tasks", label: "Tasks", icon: "ListTodo" },
      { segment: "certs", label: "Certs", icon: "Award" },
      { segment: "brand", label: "Brand", icon: "Sparkles" },
    ],
  },
  {
    id: "projects",
    href: "/projects",
    label: "Projects",
    icon: "FolderKanban",
  },
  {
    id: "goals",
    href: "/goals",
    label: "Goals",
    icon: "Target",
  },
  {
    id: "tasks",
    href: "/tasks",
    label: "Tasks",
    icon: "CheckSquare",
    defaultChild: "summary",
    children: [
      { segment: "summary", label: "Summary", icon: "LayoutList" },
      { segment: "overdue", label: "Overdue", icon: "AlertCircle" },
      { segment: "history", label: "History", icon: "History" },
      { segment: "today", label: "Today", icon: "Sun" },
      { segment: "capture", label: "Capture", icon: "PlusCircle" },
      { segment: "recurrence", label: "Recurrence", icon: "Repeat" },
    ],
  },
  {
    id: "agent",
    href: "/agent",
    label: "Agent",
    icon: "Bot",
    defaultChild: "chat",
    children: [
      { segment: "chat", label: "Chat", icon: "MessageCircle" },
      { segment: "history", label: "History", icon: "History" },
      { segment: "research", label: "Research", icon: "Search" },
      { segment: "drafts", label: "Drafts", icon: "FilePen" },
      { segment: "log", label: "Log", icon: "ScrollText" },
    ],
  },
  {
    id: "profile",
    href: "/profile",
    label: "Profile",
    icon: "User",
    defaultChild: "personal",
    children: [
      { segment: "personal", label: "Personal", icon: "Contact" },
      { segment: "hours", label: "Hours", icon: "Clock3" },
      { segment: "docs", label: "Docs", icon: "Files" },
      { segment: "geo", label: "Geo", icon: "MapPin" },
      { segment: "money", label: "Money", icon: "Wallet" },
      { segment: "defaults", label: "Defaults", icon: "SlidersHorizontal" },
      { segment: "cv", label: "CV", icon: "FileText" },
    ],
  },
  {
    id: "settings",
    href: "/settings",
    label: "Settings",
    icon: "Settings",
  },
];

export const LEGACY_REDIRECTS: {
  source: string;
  destination: string;
  permanent: true;
}[] = [
  { source: "/calendar", destination: "/time/calendar", permanent: true },
  { source: "/money", destination: "/money/stats", permanent: true },
  { source: "/agent", destination: "/agent/chat", permanent: true },
  { source: "/tasks", destination: "/tasks/summary", permanent: true },
  { source: "/profile", destination: "/profile/personal", permanent: true },
];

export function hubDefaultPath(hubHref: string): string | null {
  const hub = NAV_HUBS.find((h) => h.href === hubHref);
  if (!hub?.defaultChild) return null;
  return `${hub.href}/${hub.defaultChild}`;
}

export function findHubForPathname(pathname: string): NavHub | null {
  if (pathname === "/") {
    return NAV_HUBS.find((h) => h.href === "/") ?? null;
  }
  return (
    NAV_HUBS.find(
      (h) =>
        h.href !== "/" &&
        (pathname === h.href || pathname.startsWith(`${h.href}/`)),
    ) ?? null
  );
}
