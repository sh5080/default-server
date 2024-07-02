import { Module } from "@nestjs/common";
import { redisConfig } from "../config/env.config";
import { RedisCustomService } from "./redis.service";
import { RedisModule } from "@nestjs-modules/ioredis";

@Module({
  imports: [
    RedisModule.forRoot({
      type: "single",
      url: `redis://${redisConfig().REDIS_HOST}:${redisConfig().REDIS_PORT}`,
      options: { password: redisConfig().REDIS_PASSWORD },
    }),
  ],
  providers: [RedisCustomService],
})
export class RedisCustomModule {}
