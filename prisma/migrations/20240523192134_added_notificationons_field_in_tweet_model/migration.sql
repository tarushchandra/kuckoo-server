-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "Tweet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
