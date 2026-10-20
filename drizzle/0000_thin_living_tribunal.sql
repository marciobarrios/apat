CREATE TABLE "budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"limitMicros" integer NOT NULL,
	"reservedMicros" integer DEFAULT 0 NOT NULL,
	"spentMicros" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "budget_nonnegative" CHECK ("budgets"."limitMicros" >= 0 and "budgets"."reservedMicros" >= 0 and "budgets"."spentMicros" >= 0)
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" text PRIMARY KEY NOT NULL,
	"ownerId" text NOT NULL,
	"source" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"reservationMicros" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservation_nonnegative" CHECK ("imports"."reservationMicros" >= 0)
);
--> statement-breakpoint
CREATE TABLE "media_objects" (
	"id" text PRIMARY KEY NOT NULL,
	"ownerId" text NOT NULL,
	"importId" text,
	"objectKey" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"cleanupState" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"active" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatch_outbox" (
	"importId" text PRIMARY KEY NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"deliveredAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"ownerId" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"original" jsonb NOT NULL,
	"edited" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_ownerId_memberships_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_objects" ADD CONSTRAINT "media_objects_ownerId_memberships_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_objects" ADD CONSTRAINT "media_objects_importId_imports_id_fk" FOREIGN KEY ("importId") REFERENCES "public"."imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch_outbox" ADD CONSTRAINT "dispatch_outbox_importId_imports_id_fk" FOREIGN KEY ("importId") REFERENCES "public"."imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_ownerId_memberships_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "import_owner_key" ON "imports" USING btree ("ownerId","idempotencyKey");