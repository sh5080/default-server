import { Injectable } from "@nestjs/common";
import {
  MulterOptionsFactory,
  MulterModuleOptions,
} from "@nestjs/platform-express";
import * as AWS from "aws-sdk";
import * as multerS3 from "multer-s3";
import { S3 } from "@aws-sdk/client-s3";
import { format } from "date-fns";
import { ImageError } from "src/types/response.type";
import { errorMessage } from "./error.middleware";
import { Request } from "express";
import { v4 as uuidv4 } from "uuid";
const currentDate = format(new Date(), "yyyyMMddHHmmssSSS");

@Injectable()
export class AwsS3MulterConfigService implements MulterOptionsFactory {
  private s3: S3;

  constructor() {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    this.s3 = new S3({
      credentials: {
        accessKeyId: process.env.AWS_IAM_ACCESSKEY,
        secretAccessKey: process.env.AWS_IAM_SECRETKEY,
      },
      region: process.env.AWS_REGION,
    });
  }

  createMulterOptions(): MulterModuleOptions {
    const result = {
      storage: multerS3({
        s3: this.s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        acl: "public-read",
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req: Request, file, cb) => {
          console.log("1: ", file.originalname, req.originalUrl);
          let uploadPath = "";

          try {
            // TODO 추후 삭제예정
            if (req.originalUrl === "/api/user/images/main") {
              uploadPath = "user/profile/main";
            } else if (req.originalUrl === "/api/user/images/hobby") {
              uploadPath = "user/profile/hobby";
            } else if (
              req.originalUrl === "/api/admin/data/with-content/badge"
            ) {
              uploadPath = "user/profile/badge";
            }
            // ********************
            else if (req.originalUrl === "/api/verify/badge") {
              uploadPath = "user/verify/badge";
            } else if (req.originalUrl === "/api/verify/profile/main") {
              uploadPath = "user/verify/profile/main";
            } else if (req.originalUrl === "/api/verify/profile/hobby") {
              uploadPath = "user/verify/profile/hobby";
            } else {
              throw new ImageError(
                500,
                errorMessage.INTERNAL_SERVER_ERROR,
                "이미지 경로 관련 에러입니다."
              );
            }

            if (process.env.NODE_ENV === "development") {
              file.originalname = Buffer.from(
                file.originalname,
                "latin1"
              ).toString("utf8");
            } else {
              file.originalname = Buffer.from(
                file.originalname,
                "utf8"
              ).toString("utf8");
            }
            console.log("2: ", file.originalname);
            const shortUuid = (): string => {
              const uuid = uuidv4().replace(/-/g, "");
              return uuid.slice(0, 8);
            };

            cb(
              null,
              `sixteen/${uploadPath}/${currentDate}_${shortUuid()}_${
                file.originalname
              }`
            );
          } catch (err) {
            cb(err);
          }
        },
      }),
    };

    return result;
  }

  async deleteImageFromS3(imageUrl: string) {
    const key = imageUrl.split(".com/")[1];
    console.log("3: ", key);
    const decodedKey = decodeURIComponent(key);
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: decodedKey,
    };

    try {
      await this.s3.deleteObject(params);
      console.log(` ${decodedKey} 이미지 삭제완료`);
    } catch (error) {
      console.error(`Error deleting image ${decodedKey} from S3: ${error}`);
      throw error;
    }
  }
}
