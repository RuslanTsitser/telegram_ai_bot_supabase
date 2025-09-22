-- Add bot_id column to food_analysis table with default value
ALTER TABLE "public"."food_analysis" 
ADD COLUMN "bot_id" text NOT NULL DEFAULT 'old';

-- Remove duplicate records (keep only the latest one for each user_message_id, chat_id)
DELETE FROM "public"."food_analysis" 
WHERE id NOT IN (
  SELECT DISTINCT ON (message_id, chat_id) id
  FROM "public"."food_analysis"
  ORDER BY message_id, chat_id, created_at DESC
);

-- Drop the old unique constraint
ALTER TABLE "public"."food_analysis" 
DROP CONSTRAINT "food_analysis_message_chat_unique";

-- Drop the old unique index
DROP INDEX IF EXISTS "food_analysis_message_chat_unique";

-- Create new unique constraint with bot_id
ALTER TABLE "public"."food_analysis" 
ADD CONSTRAINT "food_analysis_message_chat_bot_unique" 
UNIQUE ("message_id", "chat_id", "bot_id");

-- Create new unique index
CREATE UNIQUE INDEX "food_analysis_message_chat_bot_unique_idx" 
ON "public"."food_analysis" 
USING btree ("message_id", "chat_id", "bot_id");

-- Add index for bot_id for better query performance
CREATE INDEX "food_analysis_bot_id_idx" 
ON "public"."food_analysis" 
USING btree ("bot_id");
