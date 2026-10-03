import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  summary: text("summary").notNull().default(""),
  workStart: text("work_start").notNull().default("09:30"),
  workEnd: text("work_end").notNull().default("17:30"),
  timezone: text("timezone").notNull().default("Asia/Riyadh"),
  salarySar: numeric("salary_sar"),
  rentShareYearlySar: numeric("rent_share_yearly_sar"),
  billsShareMinSar: numeric("bills_share_min_sar"),
  billsShareMaxSar: numeric("bills_share_max_sar"),
  iqamaYearlySar: numeric("iqama_yearly_sar"),
  cashBufferSar: numeric("cash_buffer_sar"),
  geoSequence: text("geo_sequence")
    .notNull()
    .default("remote_abroad,other_gcc,west"),
  nightsDefaultOn: boolean("nights_default_on").notNull().default(true),
  smsFirstDefault: boolean("sms_first_default").notNull().default(true),
  weekend: text("weekend").notNull().default("fri-sat"),
  github: text("github"),
  noticeDays: integer("notice_days").notNull().default(30),
  allowTrainOnFreeNonMoney: boolean("allow_train_on_free_non_money")
    .notNull()
    .default(false),
  payoutMethods: text("payout_methods").notNull().default("[]"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  splitBank: boolean("split_bank").notNull().default(false),
  agentMuted: boolean("agent_muted").notNull().default(false),
  aiRoutingMode: text("ai_routing_mode").notNull().default("cloud-first"),
});

export const aiEndpoints = pgTable("ai_endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key").notNull(),
  model: text("model"),
  trainsOnPrompts: boolean("trains_on_prompts").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  active: boolean("active").notNull().default(true),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  kind: text("kind").notNull(),
  origin: text("origin").notNull(),
  opportunitySubtype: text("opportunity_subtype"),
  stage: text("stage").notNull().default("idea"),
  examDate: date("exam_date"),
  passed: boolean("passed"),
});

export const goalProjects = pgTable(
  "goal_projects",
  {
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
  },
  (t) => [primaryKey({ columns: [t.goalId, t.projectId] })],
);

export const recurrenceTemplates = pgTable("recurrence_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  rruleOrKind: text("rrule_or_kind").notNull(),
  resources: text("resources").notNull(),
  type: text("type").notNull(),
  plannedSar: numeric("planned_sar"),
  enabled: boolean("enabled").notNull().default(true),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("P2"),
  tags: text("tags").notNull().default("[]"),
  type: text("type").notNull(),
  resources: text("resources").notNull(),
  estimateMinutes: integer("estimate_minutes"),
  plannedSar: numeric("planned_sar"),
  deadline: timestamp("deadline", { withTimezone: true }),
  floating: boolean("floating").notNull().default(true),
  projectId: uuid("project_id").references(() => projects.id),
  goalId: uuid("goal_id").references(() => goals.id),
  recurrenceTemplateId: uuid("recurrence_template_id").references(
    () => recurrenceTemplates.id,
  ),
  dueFor: date("due_for"),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  direction: text("direction").notNull(),
  amountSar: numeric("amount_sar").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  taskId: uuid("task_id").references(() => tasks.id),
  category: text("category"),
});

export const planWeeks = pgTable("plan_weeks", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekStart: date("week_start").notNull().unique(),
  nightsOn: boolean("nights_on").notNull().default(true),
  intentText: text("intent_text").notNull().default(""),
  overloadWarned: boolean("overload_warned").notNull().default(false),
});

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  body: text("body").notNull(),
  goalId: uuid("goal_id").references(() => goals.id),
  projectId: uuid("project_id").references(() => projects.id),
  taskId: uuid("task_id").references(() => tasks.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Dates the user dismissed the evening “No cash logged today” ping. */
export const cashPingSkips = pgTable("cash_ping_skips", {
  date: date("date").primaryKey(),
});

export const googleAccounts = pgTable("google_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  connectedAt: timestamp("connected_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const googleCalendarSelections = pgTable("google_calendar_selections", {
  id: uuid("id").primaryKey().defaultRandom(),
  calendarId: text("calendar_id").notNull().unique(),
  summary: text("summary").notNull().default(""),
  isPrimary: boolean("is_primary").notNull().default(false),
  selected: boolean("selected").notNull().default(false),
});

export const calendarBlocks = pgTable("calendar_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  taskId: uuid("task_id").references(() => tasks.id),
  googleEventId: text("google_event_id"),
  googleCalendarId: text("google_calendar_id"),
  ownedByApp: boolean("owned_by_app").notNull().default(true),
  dirty: boolean("dirty").notNull().default(true),
  foreignSummary: text("foreign_summary"),
  foreignStartAt: timestamp("foreign_start_at", { withTimezone: true }),
  foreignEndAt: timestamp("foreign_end_at", { withTimezone: true }),
  mirrored: boolean("mirrored").notNull().default(false),
});

export const googleSyncState = pgTable("google_sync_state", {
  calendarId: text("calendar_id").primaryKey(),
  syncToken: text("sync_token"),
  channelId: text("channel_id"),
  resourceId: text("resource_id"),
  channelExpiration: timestamp("channel_expiration", { withTimezone: true }),
});
