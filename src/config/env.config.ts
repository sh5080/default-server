import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  PORT: process.env.PORT,
  SWAGGER_USER: process.env.SWAGGER_USER,
  SWAGGER_PWD: process.env.SWAGGER_PWD,
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
}));

export const authConfig = registerAs('auth', () => ({
  ACCESS_JWT_SECRET: process.env.ACCESS_JWT_SECRET,
  REFRESH_JWT_SECRET: process.env.REFRESH_JWT_SECRET,
  ACCESS_JWT_EXPIRATION: parseInt(process.env.ACCESS_JWT_EXPIRATION, 10),
  REFRESH_JWT_EXPIRATION: parseInt(process.env.REFRESH_JWT_EXPIRATION, 10),
}));

export const redisConfig = registerAs("redis", () => ({
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
}));