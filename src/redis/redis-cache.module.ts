import { Module } from "@nestjs/common";
import { RedisCacheService } from "./redis-cache.service";
import { RedisModule } from "@nestjs-modules/ioredis";

@Module({
  imports: [RedisModule],
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class RedisCacheModule {}
