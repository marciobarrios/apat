ALTER TABLE "recipes" ADD COLUMN "creationKey" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "creationHash" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "createdAt" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_owner_creation_key" ON "recipes" USING btree ("ownerId","creationKey");--> statement-breakpoint
CREATE INDEX "recipe_owner_id" ON "recipes" USING btree ("ownerId","id");--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipe_positive_version" CHECK ("recipes"."version" > 0);