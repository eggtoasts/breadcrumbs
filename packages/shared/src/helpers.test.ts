import { describe, expect, it } from "vitest";
import { WorkRecord } from "./schemas";
import {
  activitySeries,
  averageUserRating,
  backlogDelta,
  backlogSize,
  completionRate,
  completionRateByLengthBucket,
  lostWorksCount,
  ratingDistribution,
  topFandoms,
  topTags,
  totalWordsRead,
  worksCompletedPerPeriod,
} from "./helpers";

let _id = 0;
function rec(overrides: Partial<Parameters<typeof WorkRecord.parse>[0]> = {}): WorkRecord {
  return WorkRecord.parse({
    workId: String(++_id),
    status: "completed",
    title: "Test Work",
    url: "https://archiveofourown.org/works/1",
    chaptersTotal: null,
    createdAt: new Date("2026-01-01").getTime(),
    updatedAt: new Date("2026-01-01").getTime(),
    deletedAt: null,
    lastModifiedDevice: "test",
    ...overrides,
  });
}

describe("totalWordsRead", () => {
  it("sums wordCount for completed and rereading records", () => {
    const records = [
      rec({ status: "completed", wordCount: 5_000 }),
      rec({ status: "rereading", wordCount: 10_000 }),
      rec({ status: "want", wordCount: 3_000 }),
      rec({ status: "reading", wordCount: 2_000 }),
    ];
    expect(totalWordsRead(records)).toBe(15_000);
  });

  it("filters by year using updatedAt", () => {
    const records = [
      rec({ status: "completed", wordCount: 5_000, updatedAt: new Date("2025-06-01").getTime() }),
      rec({ status: "completed", wordCount: 10_000, updatedAt: new Date("2026-03-01").getTime() }),
    ];
    expect(totalWordsRead(records, 2025)).toBe(5_000);
    expect(totalWordsRead(records, 2026)).toBe(10_000);
  });

  it("skips tombstoned records", () => {
    const records = [
      rec({ status: "completed", wordCount: 5_000 }),
      rec({ status: "completed", wordCount: 3_000, deletedAt: Date.now() }),
    ];
    expect(totalWordsRead(records)).toBe(5_000);
  });

  it("returns 0 for empty input", () => {
    expect(totalWordsRead([])).toBe(0);
  });
});

describe("completionRate", () => {
  it("calculates the fraction of started works that are completed", () => {
    const records = [
      rec({ status: "completed" }),
      rec({ status: "completed" }),
      rec({ status: "dnf" }),
      rec({ status: "want" }),
    ];
    expect(completionRate(records)).toBeCloseTo(2 / 3);
  });

  it("excludes want from started count", () => {
    const records = [rec({ status: "want" }), rec({ status: "want" })];
    expect(completionRate(records)).toBe(0);
  });

  it("returns 0 for empty input", () => {
    expect(completionRate([])).toBe(0);
  });
});

describe("completionRateByLengthBucket", () => {
  it("groups correctly and calculates per-bucket rates", () => {
    const records = [
      rec({ status: "completed", wordCount: 5_000 }),   // <10k completed
      rec({ status: "dnf", wordCount: 8_000 }),          // <10k not completed
      rec({ status: "completed", wordCount: 20_000 }),   // 10-50k completed
      rec({ status: "completed", wordCount: 75_000 }),   // 50-100k completed
      rec({ status: "completed", wordCount: 200_000 }),  // 100k+ completed
    ];
    const result = completionRateByLengthBucket(records);
    expect(result["<10k"]).toBeCloseTo(0.5);
    expect(result["10-50k"]).toBe(1);
    expect(result["50-100k"]).toBe(1);
    expect(result["100k+"]).toBe(1);
  });

  it("returns 0 for buckets with no data", () => {
    const result = completionRateByLengthBucket([]);
    expect(result["<10k"]).toBe(0);
    expect(result["100k+"]).toBe(0);
  });

  it("skips records without wordCount", () => {
    const result = completionRateByLengthBucket([rec({ status: "completed" })]);
    expect(result["<10k"]).toBe(0);
  });
});

describe("worksCompletedPerPeriod", () => {
  it("groups by month in ascending order", () => {
    const records = [
      rec({ status: "completed", updatedAt: new Date("2026-01-15").getTime() }),
      rec({ status: "completed", updatedAt: new Date("2026-01-20").getTime() }),
      rec({ status: "completed", updatedAt: new Date("2026-03-01").getTime() }),
      rec({ status: "want", updatedAt: new Date("2026-01-01").getTime() }),
    ];
    expect(worksCompletedPerPeriod(records)).toEqual([
      { period: "2026-01", count: 2 },
      { period: "2026-03", count: 1 },
    ]);
  });

  it("groups by year", () => {
    const records = [
      rec({ status: "completed", updatedAt: new Date("2025-06-01").getTime() }),
      rec({ status: "completed", updatedAt: new Date("2026-01-01").getTime() }),
      rec({ status: "completed", updatedAt: new Date("2026-06-01").getTime() }),
    ];
    expect(worksCompletedPerPeriod(records, "year")).toEqual([
      { period: "2025", count: 1 },
      { period: "2026", count: 2 },
    ]);
  });
});

describe("backlogSize", () => {
  it("counts only want-status active records", () => {
    const records = [
      rec({ status: "want" }),
      rec({ status: "want" }),
      rec({ status: "want", deletedAt: Date.now() }),
      rec({ status: "completed" }),
    ];
    expect(backlogSize(records)).toBe(2);
  });
});

describe("backlogDelta", () => {
  const jan15 = new Date("2026-01-15").getTime();
  const dec15 = new Date("2025-12-15").getTime();
  const now = new Date("2026-01-31").getTime();

  it("returns positive delta when more added this month than last", () => {
    const records = [
      rec({ status: "want", createdAt: jan15 }),
      rec({ status: "want", createdAt: jan15 }),
      rec({ status: "want", createdAt: dec15 }),
    ];
    expect(backlogDelta(records, now)).toBe(1);
  });

  it("returns 0 when equal", () => {
    const records = [
      rec({ status: "want", createdAt: jan15 }),
      rec({ status: "want", createdAt: dec15 }),
    ];
    expect(backlogDelta(records, now)).toBe(0);
  });
});

describe("ratingDistribution", () => {
  it("counts each star rating", () => {
    const records = [
      rec({ userRating: 5 }),
      rec({ userRating: 5 }),
      rec({ userRating: 3 }),
      rec({}),
    ];
    const dist = ratingDistribution(records);
    expect(dist[5]).toBe(2);
    expect(dist[3]).toBe(1);
    expect(dist[1]).toBe(0);
  });
});

describe("averageUserRating", () => {
  it("averages rated records and ignores unrated ones", () => {
    const records = [rec({ userRating: 4 }), rec({ userRating: 2 }), rec({})];
    expect(averageUserRating(records)).toBe(3);
  });

  it("returns 0 when no records are rated", () => {
    expect(averageUserRating([rec({})])).toBe(0);
  });
});

describe("topFandoms", () => {
  it("returns fandoms sorted by frequency", () => {
    const records = [
      rec({ fandoms: ["A", "B"] }),
      rec({ fandoms: ["A", "C"] }),
      rec({ fandoms: ["A"] }),
    ];
    const result = topFandoms(records, 2);
    expect(result[0]).toEqual({ name: "A", count: 3 });
    expect(result).toHaveLength(2);
  });
});

describe("topTags", () => {
  it("returns tags sorted by frequency", () => {
    const records = [
      rec({ tags: ["hurt/comfort", "fluff"] }),
      rec({ tags: ["hurt/comfort"] }),
    ];
    expect(topTags(records, 1)[0]).toEqual({ name: "hurt/comfort", count: 2 });
  });
});

describe("activitySeries", () => {
  it("returns one entry per day with a count, sorted ascending", () => {
    const records = [
      rec({ status: "completed", updatedAt: new Date("2026-01-05").getTime() }),
      rec({ status: "completed", updatedAt: new Date("2026-01-05").getTime() }),
      rec({ status: "completed", updatedAt: new Date("2026-01-10").getTime() }),
      rec({ status: "want", updatedAt: new Date("2026-01-05").getTime() }),
    ];
    expect(activitySeries(records)).toEqual([
      { date: "2026-01-05", count: 2 },
      { date: "2026-01-10", count: 1 },
    ]);
  });
});

describe("lostWorksCount", () => {
  it("counts only non-tombstoned lost records", () => {
    const records = [
      rec({ status: "lost" }),
      rec({ status: "lost", deletedAt: Date.now() }),
      rec({ status: "completed" }),
    ];
    expect(lostWorksCount(records)).toBe(1);
  });
});
