import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ResetStatus } from "src/types/status.type";

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getToken(token: string) {
    const tokenData = await this.prismaService.user_tokens.findUnique({
      where: { refresh_token: token },
    });
    return tokenData;
  }

  async upsertSession(
    userId: bigint,
    refreshToken: string,
    ip: string,
    userAgent: string
  ) {
    const transactionResult = await this.prismaService.$transaction(
      async (prisma) => {
        const insertRefresh = await prisma.user_tokens.upsert({
          where: { user_id: userId },
          update: {
            refresh_token: refreshToken,
            refresh_count: {
              increment: 1,
            },
            ip: ip,
            user_agent: userAgent,
          },
          create: {
            user_id: userId,
            refresh_token: refreshToken,
            updated_at: new Date(),
            valid: true,
            refresh_count: 0,
            ip: ip,
            user_agent: userAgent,
          },
        });
        return insertRefresh;
      }
    );
  }
  async addIncorrectPwCount(userId: bigint, type: ResetStatus) {
    if (type === ResetStatus.RESET) {
      await this.prismaService.user_incorrect_pw_count.update({
        where: { user_id: userId },
        data: { incorrect_pw_count: ResetStatus.RESET, updated_at: new Date() },
      });
    } else {
      const addedData = await this.prismaService.user_incorrect_pw_count.update(
        {
          where: { user_id: userId },
          data: {
            incorrect_pw_count: { increment: ResetStatus.CONTINUE },
            updated_at: new Date(),
          },
        }
      );
      return addedData;
    }
  }
  async blockUser(userId: bigint, invalidStatusId: number) {
    const validData = await this.prismaService.users.update({
      where: { id: userId },
      data: { valid: false },
    });
    await this.prismaService.user_invalid_status.create({
      data: {
        user_id: userId,
        // 2: 제재, 3: 정지
        user_status_id: 2,
        invalid_status_id: invalidStatusId,
      },
    });
    return validData;
  }
}
