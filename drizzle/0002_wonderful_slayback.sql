CREATE TABLE "recipe_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"ownerId" text NOT NULL,
	"requestKey" text NOT NULL,
	"sourceUrl" text NOT NULL,
	"provider" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"reservedCredits" integer NOT NULL,
	"heldCredits" integer NOT NULL,
	"extractionId" text,
	"errorCode" text,
	"draft" jsonb,
	"recipeId" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_import_credits" CHECK ("recipe_imports"."reservedCredits" > 0 and "recipe_imports"."heldCredits" >= 0 and "recipe_imports"."heldCredits" <= "recipe_imports"."reservedCredits"),
	CONSTRAINT "recipe_import_state" CHECK ("recipe_imports"."state" in ('queued', 'extracting', 'needs_review', 'saved', 'failed', 'outcome_unknown', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "recipe_imports" ADD CONSTRAINT "recipe_imports_ownerId_memberships_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_imports" ADD CONSTRAINT "recipe_imports_recipeId_recipes_id_fk" FOREIGN KEY ("recipeId") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_import_owner_key" ON "recipe_imports" USING btree ("ownerId","requestKey");--> statement-breakpoint
CREATE INDEX "recipe_import_owner_created" ON "recipe_imports" USING btree ("ownerId","createdAt","id");--> statement-breakpoint
CREATE INDEX "recipe_import_source" ON "recipe_imports" USING btree ("ownerId","sourceUrl");