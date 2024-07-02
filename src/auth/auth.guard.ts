import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthRequest } from "../types/request.type";
import { authConfig } from "../config/env.config";
import { NextFunction, Response } from "express";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const response = context.switchToHttp().getResponse();
    const nextFunction = () => {
      return true;
    };

    try {
      await this.validateRequest(request, response, nextFunction);
      return true;
    } catch (err) {
      throw err;
    }
  }

  private async validateRequest(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    const refreshName = authConfig().REFRESH_JWT_TOKEN;
    try {
      let accessToken;
      let refreshToken;

      try {
        // TODO 0418 authorization 적용으로 변경 부분
        if (
          !req.headers.authorization ||
          !req.headers.authorization.startsWith("Bearer")
        ) {
          throw new UnauthorizedException("로그인이 필요합니다.");
        }

        accessToken = req.headers.authorization.replace("Bearer ", "");

        if (req.headers["user-agent"].includes("Dart")) {
          refreshToken = req.headers[refreshName];
        } else {
          // 스웨거 로그인 요청시
          if (!accessToken && !req.headers.cookie) {
            throw new UnauthorizedException("로그인이 필요합니다.");
          } else if (!accessToken) {
            const cookies = req.headers.cookie.split("; ");
            for (const cookie of cookies) {
              if (cookie.startsWith(`${refreshName}=`)) {
                refreshToken = cookie.substring(8);
              }
            }
          }
        }
        // if (!req.headers["user-agent"].includes("Dart")) {
        //   throw new ForbiddenException("비정상적인 접근입니다.");
        // }
        console.log("acc: ", accessToken, "ref: ", refreshToken);
        if (!accessToken && refreshToken) {
          throw new UnauthorizedException("access 토큰이 존재하지 않습니다.");
        }
        if (!accessToken && !refreshToken) {
          throw new UnauthorizedException("로그인이 필요합니다.");
        }
        // 블랙리스트 확인
        const blacklistData = await this.authService.getBlacklist(accessToken);
        if (blacklistData === "blacklisted") {
          throw new ForbiddenException("비정상적인 접근입니다.");
        }
        console.log("blacklistData === ", blacklistData);
        const accessSecret = authConfig().ACCESS_JWT_SECRET;
        const { userId, role } = await this.authService.verify(
          accessToken,
          accessSecret,
          "access"
        );

        if (!role) {
          req.user = {
            userId: BigInt(userId),
          } as AuthRequest;
        } else if (role) {
          req.user = {
            userId: BigInt(userId),
            role: Number(role),
          } as AuthRequest;
        }
        next();
      } catch (err) {
        console.error("authGuard ERROR@@", err);
        if (err.message === "로그인이 필요합니다.") {
          throw new UnauthorizedException("로그인이 필요합니다.");
        } else if (err.message === "Token invalid") {
          throw new UnauthorizedException("유효하지 않은 토큰입니다.");
        } else if (err instanceof ForbiddenException) {
          throw new UnauthorizedException("비정상적인 접근입니다.");
        } else if (
          err.message === "Token expired" ||
          err.message === "access 토큰이 존재하지 않습니다."
        ) {
          try {
            if (!req.headers.cookie) {
              throw new UnauthorizedException("쿠키가 존재하지 않습니다.");
            }
            const cookies = req.headers.cookie.split("; ");
            for (const cookie of cookies) {
              if (cookie.startsWith(`${refreshName}=`)) {
                refreshToken = cookie.substring(8);
              }
            }
            if (!refreshToken) {
              throw new UnauthorizedException(
                "refresh 토큰이 존재하지 않습니다."
              );
            }
            const refreshSecret = authConfig().REFRESH_JWT_SECRET;
            const refreshData = await this.authService.verify(
              refreshToken,
              refreshSecret,
              "refresh"
            );

            const accessEnv = authConfig().ACCESS_JWT_EXPIRATION;
            const refreshEnv = authConfig().REFRESH_JWT_EXPIRATION;

            const now = new Date();
            const accessExp = new Date(now.getTime() + accessEnv * 1000);
            const refreshExp = new Date(now.getTime() + refreshEnv * 1000);

            const accessOptions: {
              expires: Date;
              httpOnly: boolean;
              secure?: boolean | undefined;
            } = {
              expires: accessExp,
              httpOnly: true,
            };

            const refreshOptions: {
              expires: Date;
              httpOnly: boolean;
              secure?: boolean | undefined;
            } = {
              expires: refreshExp,
              httpOnly: true,
            };

            if (process.env.NODE_ENV === "production") {
              accessOptions.secure = true;
              refreshOptions.secure = true;
            }
            const ip = req.ip;
            const userAgent = req.get("User-Agent");

            const token = await this.authService.updateTokens(
              refreshData.userId,
              ip,
              userAgent
            );

            if (!refreshData.role) {
              req.user = {
                userId: BigInt(refreshData.userId),
              } as AuthRequest;
            } else if (refreshData.role) {
              req.user = {
                userId: BigInt(refreshData.userId),
                role: refreshData.role,
              } as AuthRequest;
            }
            console.log("********* refresh 완료 *********");
            return {
              accessToken: token.newAccessToken,
              refreshToken: token.newRefreshToken,
              statusCode: HttpStatus.OK,
            };
          } catch (err) {
            throw new UnauthorizedException("유효하지 않은 토큰입니다.");
          }
        }
      }
    } catch (err) {
      res.clearCookie(refreshName);
      if (err instanceof ForbiddenException) {
        throw new ForbiddenException("비정상적인 접근입니다.");
      } else throw err;
    }
  }
}
