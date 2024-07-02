import {
  Controller,
  Post,
  Body,
  Req,
  ValidationPipe,
  Get,
  UseGuards,
  HttpStatus,
  Patch,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { AuthService } from "../auth/auth.service";
import { AuthRequest } from "../types/request.type";
import { UserLoginDto } from "./dto/auth.dto";
import { AuthGuard } from "./auth.guard";
import { SwaggerResponse } from "src/utils/swagger.util";
import { generateBigint } from "src/utils/swaggerExample.util";

@ApiTags("로그인")
@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: "로그인 예시" })
  @ApiOkResponse(SwaggerResponse.custom("로그인 성공", 200, "Login Success"))
  @Post("/login")
  async login(
    @Body(ValidationPipe) userLoginDto: UserLoginDto,
    @Req()
    req: AuthRequest
  ) {
    const ip = req.ip;
    const userAgent = req.get("User-Agent");
    const result = await this.authService.login(userLoginDto, ip, userAgent);

    return {
      accessToken: result.tokenData.accessToken,
      refreshToken: result.tokenData.refreshToken,
      statusCode: HttpStatus.OK,
      data: result.message,
    };
  }
  @ApiOperation({ summary: "토큰 체크 예시" })
  @ApiBearerAuth()
  @ApiOkResponse(SwaggerResponse.read("토큰체크 성공", generateBigint()))
  @UseGuards(AuthGuard)
  @Get("/token")
  async token(
    @Req()
    req: AuthRequest
  ) {
    const { userId } = req.user;
    return { statusCode: HttpStatus.OK, data: userId };
  }
  @ApiOperation({ summary: "로그아웃" })
  @ApiBearerAuth()
  @ApiOkResponse(SwaggerResponse.delete("로그아웃 성공"))
  @UseGuards(AuthGuard)
  @Post("/logout")
  async logout(
    @Req()
    req: AuthRequest
  ) {
    const accessToken = req.headers.authorization.replace("Bearer ", "");
    await this.authService.setBlacklist(accessToken);
    return { statusCode: HttpStatus.NO_CONTENT };
  }
  @ApiOperation({ summary: "접속기록 저장" })
  @ApiBearerAuth()
  @ApiOkResponse(SwaggerResponse.read("접속기록 저장 성공", generateBigint()))
  @UseGuards(AuthGuard)
  @Patch("/log")
  async setLog(@Req() req: AuthRequest) {
    const { userId } = req.user;
    const ip = req.ip;
    const userAgent = req.get("User-Agent");
    await this.authService.setLog(userId, ip, userAgent);
    return { statusCode: HttpStatus.OK, data: userId };
  }
}
