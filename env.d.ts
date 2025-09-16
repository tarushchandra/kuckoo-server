declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test";
    FRONTEND_SERVER_URL: string;
    COOKIE_DOMAIN: string;
    PORT?: string;
    DATABASE_URL: string;
    DIRECT_URL: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    REDIS_URI: string;
    AWS_ACCESS_ID_KEY: string;
    AWS_SECRET_ACCESS_KEY: string;
    AWS_BUCKET_NAME: string;
    AWS_BUCKET_REGION: string;
    AWS_CLOUDFRONT_URL;
  }
}
