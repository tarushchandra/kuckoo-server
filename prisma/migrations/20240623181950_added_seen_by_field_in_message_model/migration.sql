-- CreateTable
CREATE TABLE "_seen-messages" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_seen-messages_AB_unique" ON "_seen-messages"("A", "B");

-- CreateIndex
CREATE INDEX "_seen-messages_B_index" ON "_seen-messages"("B");

-- AddForeignKey
ALTER TABLE "_seen-messages" ADD CONSTRAINT "_seen-messages_A_fkey" FOREIGN KEY ("A") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_seen-messages" ADD CONSTRAINT "_seen-messages_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
