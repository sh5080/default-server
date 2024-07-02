import { InjectRedis } from "@nestjs-modules/ioredis";
import { Injectable } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisCacheService {
  constructor(@InjectRedis() private readonly redisClient: Redis) {}

  async get(key: string): Promise<string> {
    return this.redisClient.get(key);
  }

  async set(key: string, value: string, expireTime?: number): Promise<"OK"> {
    return this.redisClient.set(key, value, "EX", expireTime ?? 10);
  }

  async del(key: string): Promise<number> {
    return this.redisClient.del(key);
  }

  async hset(key: string, field: string, value: any) {
    return this.redisClient.hset(key, field, value);
  }

  async lpush(key: string, value: string) {
    return this.redisClient.lpush(key, value);
  }

  async lrange(key: string, start: number, stop: number) {
    return this.redisClient.lrange(key, start, stop);
  }

  async hmset(key: string, ...fields: string[]) {
    return this.redisClient.hmset(key, ...fields);
  }

  async hget(key: string, field: string) {
    return this.redisClient.hget(key, field);
  }

  async pipeline() {
    return this.redisClient.pipeline();
  }

  async hgetall(key: string) {
    return this.redisClient.hgetall(key);
  }

  async scan(
    cursor: string | number,
    pattern: string,
    count: string | number
  ): Promise<[string, string[]]> {
    return this.redisClient.scan(cursor, "MATCH", pattern, "COUNT", count);
  }

  async ttl(key: string) {
    return this.redisClient.ttl(key);
  }

  async expire(key: string, expireTime: number) {
    return this.redisClient.expire(key, expireTime);
  }
}
