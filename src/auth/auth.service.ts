import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotAcceptableException,
  UnauthorizedException,
} from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { authConfig } from "../config/env.config";
import { users } from "@prisma/client";

import { AuthRepository } from "./auth.repository";
import { UserLoginDto } from "./dto/auth.dto";
import { v4 as uuidv4 } from "uuid";
import * as bcrypt from "bcrypt";
import { UserRepository } from "src/user/user.repository";
import { RedisCacheService } from "src/redis/redis-cache.service";
import { InvalidStatus, ResetStatus } from "src/types/status.type";
@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly userRepository: UserRepository,
    private readonly redisService: RedisCacheService
  ) {}
  async login(userLoginDto: UserLoginDto, ip: string, userAgent: string) {
    let message: string;
    const userData = await this.userRepository.getUserByEmail(
      userLoginDto.email
    );
    if (!userData) {
      throw new BadRequestException(
        "없는 계정이거나 비밀번호가 일치하지 않습니다."
      );
    }
    const isDisabled = userData.status.some(
      (status) => status.invalid_status_id === InvalidStatus.DISABLED
    );

    if (isDisabled) {
      message = "비활성화된 계정입니다.";
    }
    if (!userData.valid) {
      throw new NotAcceptableException(
        "제한된 계정입니다. 고객센터로 문의해 주세요."
      );
    }
    const isPasswordValid = await this.verifyPassword(
      userLoginDto.password,
      userData.password
    );
    if (!isPasswordValid) {
      const addedData = await this.authRepository.addIncorrectPwCount(
        userData.id,
        ResetStatus.CONTINUE
      );
      if (addedData.incorrect_pw_count > 5) {
        // 2: 비밀번호 누적 제한
        await this.authRepository.blockUser(
          userData.id,
          InvalidStatus.PASSWORD_ATTEMPTS_EXCEEDED
        );
        throw new BadRequestException(
          "비밀번호 5회 이상 오류로 계정 로그인이 제한되었습니다."
        );
      }
      throw new BadRequestException(
        `5회 로그인 실패시 로그인이 제한됩니다. (${addedData.incorrect_pw_count}/5)`
      );
    }
    await this.authRepository.addIncorrectPwCount(
      userData.id,
      ResetStatus.RESET
    );

    const tokenData = await this.createTokens(
      userData.id,
      userData.gender,
      userData.grade,
      ip,
      userAgent,
      userData.role
    );
    return { tokenData, message };
  }
  private async verifyPassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
  async createTokens(
    userId: bigint,
    gender: boolean,
    grade: number,
    ip: string,
    userAgent: string,
    role: number
  ) {
    let accessTokenPayload: {
      userId: string;
      gender: boolean;
      grade: string;
      role?: string;
    };

    // jwt파싱해도 role확인되지 않도록 일반유저는 role 넣지 않음
    if (role > 0) {
      accessTokenPayload = {
        userId: userId.toString(),
        gender,
        grade: grade.toString(),
        role: role.toString(),
      };
    } else {
      accessTokenPayload = {
        userId: userId.toString(),
        gender,
        grade: grade.toString(),
      };
    }
    const accessToken = jwt.sign(
      accessTokenPayload,
      authConfig().ACCESS_JWT_SECRET,
      {
        expiresIn: authConfig().ACCESS_JWT_EXPIRATION,
        audience: "neurocircuit",
        issuer: authConfig().JWT_ISSUER,
      }
    );
    const refreshTokenPayload = { uuid: uuidv4() };
    const refreshToken = jwt.sign(
      refreshTokenPayload,
      authConfig().REFRESH_JWT_SECRET,
      {
        expiresIn: authConfig().REFRESH_JWT_EXPIRATION,
        audience: "neurocircuit",
        issuer: authConfig().JWT_ISSUER,
      }
    );
    const loginTime = new Date().toISOString();
    const lastActivityTime = loginTime;
    const sessionKey = `user_session:${userId}`;

    await this.redisService.hmset(
      sessionKey,
      "user_id",
      String(userId),
      "refresh_token",
      refreshToken,
      "login_time",
      loginTime,
      "ip",
      ip,
      "user_agent",
      userAgent,
      "last_activity_time",
      lastActivityTime
    );
    await this.authRepository.upsertSession(
      userId,
      refreshToken,
      ip,
      userAgent
    );
    return { accessToken, refreshToken };
  }
  async updateTokens(userId: bigint, ip: string, userAgent: string) {
    const userData = await this.userRepository.getUserByUserId(userId);
    if (!userData) {
      throw new NotAcceptableException("존재하지 않는 user입니다.");
    }
    let accessTokenPayload: {
      userId: string;
      gender: boolean;
      grade: string;
      role?: string;
    };
    // jwt파싱해도 role확인되지 않도록 일반유저는 role 넣지 않음
    if (userData.role > 0) {
      accessTokenPayload = {
        userId: userId.toString(),
        gender: userData.gender,
        grade: userData.grade.toString(),
        role: userData.role.toString(),
      };
    } else {
      accessTokenPayload = {
        userId: userId.toString(),
        gender: userData.gender,
        grade: userData.grade.toString(),
      };
    }
    const newAccessToken = jwt.sign(
      accessTokenPayload,
      authConfig().ACCESS_JWT_SECRET,
      {
        expiresIn: authConfig().ACCESS_JWT_EXPIRATION,
        audience: "neurocircuit",
        issuer: authConfig().JWT_ISSUER,
      }
    );
    const refreshTokenPayload = { uuid: uuidv4() };
    const newRefreshToken = jwt.sign(
      refreshTokenPayload,
      authConfig().REFRESH_JWT_SECRET,
      {
        expiresIn: authConfig().REFRESH_JWT_EXPIRATION,
        audience: "neurocircuit",
        issuer: authConfig().JWT_ISSUER,
      }
    );

    const loginTime = new Date().toISOString();
    const lastActivityTime = loginTime;
    const sessionKey = `user_session:${userId}`;

    await this.redisService.hmset(
      sessionKey,
      "refresh_token",
      newRefreshToken,
      "ip",
      ip,
      "user_agent",
      userAgent,
      "last_activity_time",
      lastActivityTime
    );
    await this.authRepository.upsertSession(
      userId,
      newRefreshToken,
      ip,
      userAgent
    );

    return { newAccessToken, newRefreshToken };
  }

  async verify(token: string, secret: string, type: string) {
    try {
      if (type === "refresh") {
        const sessionData = await this.authRepository.getToken(token);
        if (!sessionData) {
          throw new UnauthorizedException("인증 정보가 없습니다.");
        }
        const userData = await this.userRepository.getUserByUserId(
          sessionData.user_id
        );
        if (!userData) {
          throw new UnauthorizedException(
            "인증 정보에 해당하는 사용자가 없습니다."
          );
        }
        if (!userData.valid) {
          throw new ForbiddenException(
            "제한된 사용자는 서비스를 이용할 수 없습니다. 고객센터에 문의해 주세요."
          );
        }
        if (!userData.role) {
          return {
            userId: userData.id,
            gender: userData.gender,
            grade: userData.grade,
          };
        } else {
          return {
            userId: userData.id,
            gender: userData.gender,
            grade: userData.grade,
            role: userData.role,
          };
        }
      } else {
        const payload = jwt.verify(token, secret, {
          algorithms: ["HS256"],
        }) as jwt.JwtPayload & users;
        const { userId, gender, grade, role } = payload;
        if (!role) {
          return { userId, gender, grade };
        } else {
          return { userId, gender, grade, role };
        }
      }
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException("Token expired");
      } else if (err instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException("Token invalid");
      } else {
        throw new InternalServerErrorException("UnExpected");
      }
    }
  }

  async setBlacklist(accessToken: string) {
    await this.redisService.set(
      accessToken,
      "blacklist",
      authConfig().ACCESS_JWT_EXPIRATION
    );
  }
  async getBlacklist(accessToken: string): Promise<string> {
    const logoutData = await this.redisService.get(accessToken);
    let response: string;
    if (logoutData === "blacklist") {
      response = "blacklisted";
    } else response = "OK";
    return response;
  }
  async setLog(userId: bigint, ip: string, userAgent: string) {
    const loginTime = new Date().toISOString();
    const lastActivityTime = loginTime;
    const sessionKey = `user_session:${userId}`;

    return await this.redisService.hmset(
      sessionKey,
      "ip",
      ip,
      "user_agent",
      userAgent,
      "last_activity_time",
      lastActivityTime
    );
  }
}
