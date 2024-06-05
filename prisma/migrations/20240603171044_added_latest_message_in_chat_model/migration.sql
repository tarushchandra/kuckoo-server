/*
  Warnings:

  - A unique constraint covering the columns `[chat_id]` on the table `Message` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Message_chat_id_key" ON "Message"("chat_id");
