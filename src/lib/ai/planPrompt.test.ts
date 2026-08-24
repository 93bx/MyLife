import { describe, expect, it } from "vitest";
import {
  parsePlanAgentJson,
  resolvePlanScope,
  riyadhWeekStartFriday,
} from "./planPrompt";

describe("parsePlanAgentJson", () => {
  it("parses a bare PlanAgentResult JSON object", () => {
    const raw = JSON.stringify({
      nightsOn: true,
      warning: "Over capacity",
      tasks: [
        {
          id: "task-1",
          title: "Ship SMS report",
          type: "sms",
          priority: "P1",
          resources: "time",
          floating: false,
          projectHint: "SMS core",
        },
        {
          title: "Pay rent share",
          type: "money",
          priority: "P2",
          resources: "money",
          floating: true,
        },
      ],
    });

    expect(parsePlanAgentJson(raw)).toEqual({
      nightsOn: true,
      warning: "Over capacity",
      tasks: [
        {
          id: "task-1",
          title: "Ship SMS report",
          type: "sms",
          priority: "P1",
          resources: "time",
          floating: false,
          projectHint: "SMS core",
        },
        {
          title: "Pay rent share",
          type: "money",
          priority: "P2",
          resources: "money",
          floating: true,
        },
      ],
    });
  });

  it("extracts JSON from a markdown fenced block", () => {
    const raw = `Sure — here is the plan:

\`\`\`json
{"nightsOn":false,"tasks":[{"title":"Focus block","type":"personal","priority":"P3","resources":"time","floating":true}]}
\`\`\`
`;

    expect(parsePlanAgentJson(raw)).toEqual({
      nightsOn: false,
      tasks: [
        {
          title: "Focus block",
          type: "personal",
          priority: "P3",
          resources: "time",
          floating: true,
        },
      ],
    });
  });

  it("accepts empty object and optional-only fields", () => {
    expect(parsePlanAgentJson("{}")).toEqual({});
    expect(parsePlanAgentJson('{"warning":"ok"}')).toEqual({ warning: "ok" });
    expect(parsePlanAgentJson('{"tasks":[]}')).toEqual({ tasks: [] });
  });

  it("returns null for invalid JSON text", () => {
    expect(parsePlanAgentJson("not json")).toBeNull();
    expect(parsePlanAgentJson("{")).toBeNull();
    expect(parsePlanAgentJson("")).toBeNull();
  });

  it("returns null when tasks entries are malformed", () => {
    expect(
      parsePlanAgentJson(
        JSON.stringify({
          tasks: [{ title: "x", type: "sms", priority: "P9", resources: "time", floating: true }],
        }),
      ),
    ).toBeNull();

    expect(
      parsePlanAgentJson(
        JSON.stringify({
          tasks: [{ title: "x", type: "sms", priority: "P1", resources: "energy", floating: true }],
        }),
      ),
    ).toBeNull();

    expect(
      parsePlanAgentJson(
        JSON.stringify({
          tasks: [{ type: "sms", priority: "P1", resources: "time", floating: true }],
        }),
      ),
    ).toBeNull();

    expect(
      parsePlanAgentJson(
        JSON.stringify({
          tasks: [
            {
              title: "x",
              type: "sms",
              priority: "P1",
              resources: "time",
              floating: "yes",
            },
          ],
        }),
      ),
    ).toBeNull();
  });

  it("returns null when nightsOn or warning have wrong types", () => {
    expect(parsePlanAgentJson('{"nightsOn":"yes"}')).toBeNull();
    expect(parsePlanAgentJson('{"warning":1}')).toBeNull();
    expect(parsePlanAgentJson('{"tasks":"nope"}')).toBeNull();
  });

  it("ignores unknown task fields but keeps known ones", () => {
    const parsed = parsePlanAgentJson(
      JSON.stringify({
        tasks: [
          {
            title: "Keep me",
            type: "sms",
            priority: "P2",
            resources: "both",
            floating: false,
            extra: "drop",
          },
        ],
        stray: true,
      }),
    );
    expect(parsed).toEqual({
      tasks: [
        {
          title: "Keep me",
          type: "sms",
          priority: "P2",
          resources: "both",
          floating: false,
        },
      ],
    });
  });
});

describe("resolvePlanScope", () => {
  it("honors explicit week or day", () => {
    expect(resolvePlanScope("week", "today only")).toBe("week");
    expect(resolvePlanScope("day", "plan my week")).toBe("day");
  });

  it("auto treats week/nights mentions as week, else day", () => {
    expect(resolvePlanScope("auto", "Plan my week around SMS")).toBe("week");
    expect(resolvePlanScope("auto", "Keep nights on")).toBe("week");
    expect(resolvePlanScope("auto", "What should I do today?")).toBe("day");
  });
});

describe("riyadhWeekStartFriday", () => {
  it("returns the Friday that starts the Riyadh weekend week", () => {
    // Wednesday 2026-08-26 12:00 UTC → still Wednesday in Riyadh → week started Fri 2026-08-21
    expect(riyadhWeekStartFriday(new Date("2026-08-26T12:00:00Z"))).toBe(
      "2026-08-21",
    );
    // Friday 2026-08-21 morning Riyadh
    expect(riyadhWeekStartFriday(new Date("2026-08-21T06:00:00Z"))).toBe(
      "2026-08-21",
    );
  });
});
