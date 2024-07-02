import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { validationSchema } from './config/validationSchema';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from "nestjs-pino";
import { pinoHttpOptions } from './pino';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    LoggerModule.forRoot({
      pinoHttp: pinoHttpOptions,
      exclude: [
        { method: RequestMethod.GET, path: "health" },
        { method: RequestMethod.GET, path: "favicon.ico" },
      ],
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
