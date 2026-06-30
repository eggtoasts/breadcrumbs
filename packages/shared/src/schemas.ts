import { z } from "zod";

export const ReadingStatus = z.enum([
  "want",
  "reading",
  "completed",
  "rereading",
  "onhold",
  "dnf",
  "lost",
]);
export type ReadingStatus = z.infer<typeof ReadingStatus>;

export const ContentRating = z.enum(["G", "T", "M", "E", "NR"]);
export type ContentRating = z.infer<typeof ContentRating>;

export const WorkRecord = z.object({
  workId: z.string(),
  status: ReadingStatus,
  title: z.string(),
  author: z.string().optional(),
  url: z.string(),

  wordCount: z.number().int().optional(),
  chaptersRead: z.number().int().optional(),
  chaptersTotal: z.number().int().nullable(),
  complete: z.boolean().optional(),
  rating: ContentRating.optional(),
  fandoms: z.array(z.string()).default([]),
  relationships: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),

  userRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),

  ao3BookmarkId: z.string().nullable().default(null),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  lastModifiedDevice: z.string(),
});
export type WorkRecord = z.infer<typeof WorkRecord>;

export const SyncPushRequest = z.object({
  since: z.number(),
  changes: z.array(WorkRecord),
});
export type SyncPushRequest = z.infer<typeof SyncPushRequest>;

export const SyncPullResponse = z.object({
  serverTime: z.number(),
  changes: z.array(WorkRecord),
});
export type SyncPullResponse = z.infer<typeof SyncPullResponse>;
