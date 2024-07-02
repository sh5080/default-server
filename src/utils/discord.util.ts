import axios from "axios";
import { appConfig } from "../config/env.config";
import { DiscordStatus } from "../type/status.type";

export const sendDiscord = async (type: DiscordStatus, message: string) => {
  let color = 0x0000ff; // 파란색
  switch (type) {
    case DiscordStatus.ERROR:
      color = 0xff0000; // 빨간색
      break;
    case DiscordStatus.CAUTION:
      color = 0xffd700; // 금색
      break;
  }

  try {
    await axios.post(appConfig().DISCORD_WEBHOOK_URL, {
      embeds: [
        {
          title: type,
          description: message,
          color: color,
        },
      ],
    });
    console.log(`${type}: 디스코드 전송 완료`);
  } catch (error) {
    console.error("디스코드 전송 중 오류가 발생했습니다:", error.message);
  }
};
