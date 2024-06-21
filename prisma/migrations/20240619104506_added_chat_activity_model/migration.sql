-- CreateEnum
CREATE TYPE "ChatActivityType" AS ENUM ('MEMBER_ADDED', 'MEMBER_REMOVED', 'MADE_ADMIN');

-- CreateTable
CREATE TABLE "ChatActivity" (
    "id" TEXT NOT NULL,
    "type" "ChatActivityType" NOT NULL,
    "chat_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatActivity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChatActivity" ADD CONSTRAINT "ChatActivity_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatActivity" ADD CONSTRAINT "ChatActivity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatActivity" ADD CONSTRAINT "ChatActivity_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
