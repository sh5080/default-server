import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { Redis } from "ioredis";
import { InjectRedis } from "@nestjs-modules/ioredis";

@Injectable()
export class RedisCustomService implements OnModuleInit {
  constructor(@InjectRedis() private readonly redisClient: Redis) {}

  async onModuleInit() {
    try {
      if (!this.redisClient.status || this.redisClient.status === "end") {
        await this.redisClient.connect();
        console.log("REDIS CONNECT!!!");
      } else {
        console.log("Redis is already connected.");
      }
    } catch (error) {
      console.error("Error connecting to Redis: " + error.message);
      throw new Error("Failed to connect to Redis.");
    }
  }
}
