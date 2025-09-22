-- Add bot_id column to message_relationships table with default value
ALTER TABLE "public"."message_relationships" 
ADD COLUMN "bot_id" text NOT NULL DEFAULT 'old';

-- Remove duplicate records (keep only the latest one for each user_message_id, chat_id)
DELETE FROM "public"."message_relationships" 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_message_id, chat_id) id
  FROM "public"."message_relationships"
  ORDER BY user_message_id, chat_id, created_at DESC
);

-- Drop the old unique constraint
ALTER TABLE "public"."message_relationships" 
DROP CONSTRAINT "message_relationships_pkey";

-- Drop the old unique index
DROP INDEX IF EXISTS "message_relationships_pkey";

-- Create new unique constraint with bot_id
ALTER TABLE "public"."message_relationships" 
ADD CONSTRAINT "message_relationships_pkey" 
PRIMARY KEY ("user_message_id", "chat_id", "bot_id");

-- Add index for bot_id for better query performance
CREATE INDEX "message_relationships_bot_id_idx" 
ON "public"."message_relationships" 
USING btree ("bot_id");
