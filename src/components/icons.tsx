import type { LucideIcon, LucideProps } from "lucide-react";
import {
  AlarmClock,
  AlertCircle,
  Award,
  Banknote,
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  CalendarRange,
  CheckSquare,
  Clock,
  Clock3,
  Contact,
  FilePen,
  FileText,
  Files,
  Focus,
  FolderKanban,
  Gauge,
  History,
  Kanban,
  LayoutDashboard,
  LayoutList,
  ListTodo,
  MapPin,
  MessageCircle,
  MessageSquare,
  PlusCircle,
  Receipt,
  Repeat,
  Route,
  ScrollText,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Target,
  User,
  UserRound,
  Wallet,
} from "lucide-react";

/** PascalCase lucide names used by `NAV_HUBS` / children in `src/lib/nav/config.ts`. */
export const ICONS = {
  AlarmClock,
  AlertCircle,
  Award,
  Banknote,
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Calendar,
  CalendarRange,
  CheckSquare,
  Clock,
  Clock3,
  Contact,
  FilePen,
  FileText,
  Files,
  Focus,
  FolderKanban,
  Gauge,
  History,
  Kanban,
  LayoutDashboard,
  LayoutList,
  ListTodo,
  MapPin,
  MessageCircle,
  MessageSquare,
  PlusCircle,
  Receipt,
  Repeat,
  Route,
  ScrollText,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Target,
  User,
  UserRound,
  Wallet,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function getIcon(name: string): LucideIcon | undefined {
  return ICONS[name as IconName];
}

export function Icon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const Comp = getIcon(name);
  if (!Comp) return null;
  return <Comp {...props} />;
}
