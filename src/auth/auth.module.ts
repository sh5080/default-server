import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { authConfig } from "../config/env.config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthRepository } from "./auth.repository";
import { UserRepository } from "src/user/user.repository";
import { RedisCacheModule } from "src/redis/redis-cache.module";

@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    PrismaModule,
    RedisCacheModule,
  ],
  providers: [AuthService, AuthRepository, UserRepository],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
