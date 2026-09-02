export type CalendarItem = {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  ownedByApp: boolean;
  mirrored: boolean;
};

export type CalendarWindow = {
  start: Date;
  end: Date;
};

function overlapsWindow(
  item: Pick<CalendarItem, "startAt" | "endAt">,
  window: CalendarWindow,
): boolean {
  return item.startAt < window.end && item.endAt > window.start;
}

export function mergeCalendarItems(
  foreign: CalendarItem[],
  owned: CalendarItem[],
  window: CalendarWindow,
): CalendarItem[] {
  return [...foreign, ...owned]
    .filter((item) => overlapsWindow(item, window))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}
