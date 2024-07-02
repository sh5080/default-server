import { randomUUID } from "crypto";
import { Options } from "pino-http";

export const pinoHttpOptions: Options = {
  genReqId: (req, res) => {
    req.id = randomUUID();
    return req.id;
  },
  serializers: {
    req(req) {
      req.body = req.raw.body;
      return req;
    },
    res(res) {
      delete res.headers;
      return res;
    },
    err(err) {
      // remove unneccessary key from error
      err["config"] && delete err["config"]["transitional"];
      err["config"] && delete err["config"]["adapter"];
      err["config"] && delete err["config"]["transformRequest"];
      err["config"] && delete err["config"]["transformResponse"];
      err["config"] && delete err["config"]["xsrfCookieName"];
      err["config"] && delete err["config"]["xsrfHeaderName"];
      err["config"] && delete err["config"]["maxContentLength"];
      err["config"] && delete err["config"]["maxBodyLength"];
      err["config"] && delete err["config"]["env"];
      return err;
    },
  },
  customAttributeKeys: {
    req: "request",
    err: "error",
    reqId: "requestId",
    res: "response",
  },
  quietReqLogger: true,
  level: process.env.NODE_ENV !== "production" ? "debug" : "info",
  transport:
    process.env.NODE_ENV != "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "context",
          },
        }
      : undefined,
};
