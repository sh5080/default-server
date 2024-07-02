import {
  Injectable,
  NestMiddleware,
  NotAcceptableException,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const userAgent = req.get("user-agent") || "";
    if (userAgent.includes("postman")) {
      throw new NotAcceptableException("허용하지 않는 접근입니다.");
    }

    next();
  }
}
