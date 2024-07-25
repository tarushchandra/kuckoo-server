/*
  Warnings:

  - The values [MADE_ADMIN] on the enum `ChatActivityType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ChatActivityType_new" AS ENUM ('MEMBER_ADDED', 'MEMBER_REMOVED', 'ADMIN_ADDED', 'ADMIN_REMOVED');
ALTER TABLE "ChatActivity" ALTER COLUMN "type" TYPE "ChatActivityType_new" USING ("type"::text::"ChatActivityType_new");
ALTER TYPE "ChatActivityType" RENAME TO "ChatActivityType_old";
ALTER TYPE "ChatActivityType_new" RENAME TO "ChatActivityType";
DROP TYPE "ChatActivityType_old";
COMMIT;
