import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { Response } from "express";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { authConfig } from "src/config/env.config";
import { Alert } from "src/sse/sse.type";
import { RewardService } from "src/reward/reward.service";
import { AuthRequest } from "src/types/request.type";
import { ResponseMessage, RewardResponse } from "src/types/response.type";
import {
  createCreditMap,
  createMileageMap,
  deductCreditMap,
} from "src/types/reward-calculate.type";
import {
  CreditDeductAmount,
  Reward,
  RewardOption,
  RewardReason,
} from "src/types/status.type";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(
    private readonly rewardService: RewardService,
    private readonly reflector: Reflector
  ) {}
  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    let requiredCredit = this.reflector.get<CreditDeductAmount>(
      "requiredCredit",
      context.getHandler()
    );
    const requiredMileage = this.reflector.get<CreditDeductAmount>(
      "requiredMileage",
      context.getHandler()
    );

    const request = context.switchToHttp().getRequest();
    const user: AuthRequest = request.user;

    // 현재 크레딧 조회
    if (requiredCredit) {
      const currentCredit = await this.rewardService.getUserReward(
        user.userId,
        Reward.CREDIT
      );
      console.log(
        `현재 userId: ${user.userId}의 보유 크레딧은 ${currentCredit}입니다. `
      );
      if (requiredCredit === CreditDeductAmount.MEET_PURCHASE) {
        const rewardReasonId: RewardReason = Number(
          request.params.rewardReasonId
        );
        requiredCredit = deductCreditMap[rewardReasonId];
        if (!requiredCredit) {
          throw new BadRequestException("올바른 rewardReasonId가 아닙니다.");
        }
      }

      if (currentCredit < requiredCredit) {
        throw new BadRequestException(
          `현재 userId: ${user.userId}의 보유 크레딧은 ${currentCredit}입니다. 크레딧이 부족합니다. 필요 크레딧은 ${requiredCredit}입니다.`
        );
      }
      request.user = { ...user, credit: currentCredit };
    }

    // 현재 마일리지 조회
    if (requiredMileage) {
      const currentMileage = await this.rewardService.getUserReward(
        user.userId,
        Reward.MILEAGE
      );
      console.log(
        `현재 userId: ${user.userId}의 보유 크레딧은 ${currentMileage}입니다. `
      );
      if (currentMileage < requiredMileage) {
        throw new BadRequestException(
          `현재 userId: ${user.userId}의 보유 마일리지는 ${currentMileage}입니다. 마일리지가 부족합니다. 필요 마일리지는 ${requiredMileage}입니다.`
        );
      }
      request.user = { ...user, mileage: currentMileage };
    }

    return next.handle().pipe(
      map(async (res) => {
        const response = context.switchToHttp().getResponse<Response>();
        if (response.getHeader("content-type") === "text/event-stream") {
          const alert: Alert = res;
          response.write(`id: ${alert.userId}\n`);
          response.write(`event: ${alert.type}\n`);
          response.write(`data: ${JSON.stringify(alert.data)}\n\n`);
        }

        const { accessToken, refreshToken, statusCode, data, reward } = res;

        if (reward) {
          const {
            type,
            option,
            userId,
            originRewards,
            rewardReasonId,
          }: RewardResponse = reward;
          let amount: number;

          if (option === RewardOption.CREATE) {
            if (type === Reward.CREDIT) {
              amount = createCreditMap[rewardReasonId];
              reward.type = "credit";
            } else {
              amount = createMileageMap[rewardReasonId];
              reward.type = "mileage";
            }
            const createdData = await this.rewardService.createReward(
              type,
              userId,
              amount,
              rewardReasonId
            );
            reward.option = "create";
            reward.resultRewards = createdData;
          } else if (option === RewardOption.DEDUCT) {
            if (type === Reward.CREDIT) {
              amount = deductCreditMap[rewardReasonId];
              reward.type = "credit";
            } else {
              reward.type = "mileage";
            }
            // 마일리지는 별도로 관리한다고 함
            const deductedData = await this.rewardService.deductReward(
              type,
              userId,
              originRewards,
              amount,
              rewardReasonId
            );
            reward.option = "deduct";
            reward.resultRewards = deductedData;
          }
        }
        if (accessToken && refreshToken) {
          const now = new Date();
          const refreshEnv = authConfig().REFRESH_JWT_EXPIRATION;
          const refreshExp = new Date(now.getTime() + refreshEnv * 1000);

          const refreshOptions: {
            expires: Date;
            httpOnly: boolean;
            secure?: boolean | undefined;
          } = {
            expires: refreshExp,
            httpOnly: true,
          };
          const refreshName = authConfig().REFRESH_JWT_TOKEN;

          response
            .setHeader("Authorization", `Bearer ${res.accessToken}`)
            .cookie(refreshName, res.refreshToken, refreshOptions);
        }
        return {
          statusCode,
          message: this.getMessage(statusCode),
          data,
          reward,
        };
      })
    );
  }
  private getMessage(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.OK:
        return ResponseMessage.OK;
      case HttpStatus.CREATED:
        return ResponseMessage.CREATED;
      default:
        return ResponseMessage.DEFAULT;
    }
  }
}
