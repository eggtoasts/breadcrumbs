CREATE TYPE "public"."content_rating" AS ENUM('G', 'T', 'M', 'E', 'NR');--> statement-breakpoint
CREATE TYPE "public"."reading_status" AS ENUM('want', 'reading', 'completed', 'rereading', 'onhold', 'dnf', 'lost');--> statement-breakpoint
CREATE TABLE "work_records" (
	"user_id" text NOT NULL,
	"work_id" text NOT NULL,
	"status" "reading_status" NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"url" text NOT NULL,
	"word_count" integer,
	"chapters_read" integer,
	"chapters_total" integer,
	"complete" boolean,
	"rating" "content_rating",
	"fandoms" text[] DEFAULT '{}' NOT NULL,
	"relationships" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"user_rating" integer,
	"notes" text,
	"ao3_bookmark_id" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint,
	"last_modified_device" text NOT NULL,
	CONSTRAINT "work_records_user_id_work_id_pk" PRIMARY KEY("user_id","work_id")
);
