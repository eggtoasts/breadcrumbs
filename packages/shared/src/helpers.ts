import type { WorkRecord } from "./schemas";

export type LengthBucket = "<10k" | "10-50k" | "50-100k" | "100k+";

const COMPLETED = new Set<WorkRecord["status"]>(["completed", "rereading"]);

function active(records: WorkRecord[]): WorkRecord[] {
  return records.filter((r) => r.deletedAt === null);
}

function bucket(wordCount: number): LengthBucket {
  if (wordCount < 10_000) return "<10k";
  if (wordCount < 50_000) return "10-50k";
  if (wordCount < 100_000) return "50-100k";
  return "100k+";
}

// Sum of wordCount for completed/rereading records, optionally filtered to a calendar year
export function totalWordsRead(records: WorkRecord[], year?: number): number {
  return active(records)
    .filter((r) => COMPLETED.has(r.status))
    .filter((r) => year === undefined || new Date(r.updatedAt).getUTCFullYear() === year)
    .reduce((sum, r) => sum + (r.wordCount ?? 0), 0);
}

function utcPeriod(ts: number, granularity: "month" | "year" | "day"): string {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  if (granularity === "year") return String(y);
  if (granularity === "month") return `${y}-${m}`;
  return `${y}-${m}-${day}`;
}

// Fraction of started works (non-want) that are completed or rereading
export function completionRate(records: WorkRecord[]): number {
  const started = active(records).filter((r) => r.status !== "want");
  if (started.length === 0) return 0;
  return started.filter((r) => COMPLETED.has(r.status)).length / started.length;
}

// Completion rate broken down by word-count bucket
export function completionRateByLengthBucket(records: WorkRecord[]): Record<LengthBucket, number> {
  const tally: Record<LengthBucket, { started: number; completed: number }> = {
    "<10k": { started: 0, completed: 0 },
    "10-50k": { started: 0, completed: 0 },
    "50-100k": { started: 0, completed: 0 },
    "100k+": { started: 0, completed: 0 },
  };

  for (const r of active(records)) {
    if (r.status === "want" || r.wordCount === undefined) continue;
    const b = bucket(r.wordCount);
    tally[b].started++;
    if (COMPLETED.has(r.status)) tally[b].completed++;
  }

  const rate = (b: LengthBucket) =>
    tally[b].started === 0 ? 0 : tally[b].completed / tally[b].started;

  return {
    "<10k": rate("<10k"),
    "10-50k": rate("10-50k"),
    "50-100k": rate("50-100k"),
    "100k+": rate("100k+"),
  };
}

// Completed works grouped by month ("YYYY-MM") or year ("YYYY"), sorted ascending.
export function worksCompletedPerPeriod(
  records: WorkRecord[],
  granularity: "month" | "year" = "month",
): Array<{ period: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of active(records)) {
    if (!COMPLETED.has(r.status)) continue;
    const period = utcPeriod(r.updatedAt, granularity);
    counts.set(period, (counts.get(period) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, count]) => ({ period, count }));
}

// Number of records currently in "want" status
export function backlogSize(records: WorkRecord[]): number {
  return active(records).filter((r) => r.status === "want").length;
}

//Month-over-month delta: want-records created this calendar month
//minus want-records created the previous calendar month
export function backlogDelta(records: WorkRecord[], now = Date.now()): number {
  const nowPeriod = utcPeriod(now, "month");
  const d = new Date(now);
  const prevDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  const prevPeriod = utcPeriod(prevDate.getTime(), "month");

  let thisCount = 0;
  let prevCount = 0;
  for (const r of active(records)) {
    if (r.status !== "want") continue;
    const p = utcPeriod(r.createdAt, "month");
    if (p === nowPeriod) thisCount++;
    if (p === prevPeriod) prevCount++;
  }
  return thisCount - prevCount;
}

// Count of records per userRating star (1–5)
export function ratingDistribution(records: WorkRecord[]): Record<1 | 2 | 3 | 4 | 5, number> {
  const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of active(records)) {
    const rating = r.userRating;
    if (rating !== undefined) dist[rating as 1 | 2 | 3 | 4 | 5]++;
  }
  return dist;
}

// Average userRating across rated records, or 0 if none
export function averageUserRating(records: WorkRecord[]): number {
  let sum = 0;
  let count = 0;
  for (const r of active(records)) {
    const rating = r.userRating;
    if (rating !== undefined) {
      sum += rating;
      count++;
    }
  }
  return count === 0 ? 0 : sum / count;
}

function countFrequency(items: string[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count }));
}

// Top fandoms by number of records that include them.
export function topFandoms(records: WorkRecord[], n = 10): Array<{ name: string; count: number }> {
  return countFrequency(active(records).flatMap((r) => r.fandoms)).slice(0, n);
}

// Top freeform tags by frequency
export function topTags(records: WorkRecord[], n = 10): Array<{ name: string; count: number }> {
  return countFrequency(active(records).flatMap((r) => r.tags)).slice(0, n);
}

// Daily activity series for a calendar heatmap: completed works per YYYY-MM-DD
export function activitySeries(records: WorkRecord[]): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of active(records)) {
    if (!COMPLETED.has(r.status)) continue;
    const date = utcPeriod(r.updatedAt, "day");
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

// Number of records with status "lost" (work deleted from AO3)
export function lostWorksCount(records: WorkRecord[]): number {
  return active(records).filter((r) => r.status === "lost").length;
}
