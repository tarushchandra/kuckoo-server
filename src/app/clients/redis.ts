import { Redis } from "ioredis";

const REDIS_URI =
  "rediss://default:a63a6f8a45744b8bbba7758805ebe0dc@apn1-above-burro-35000.upstash.io:35000";

export const redisClient = new Redis(REDIS_URI);
