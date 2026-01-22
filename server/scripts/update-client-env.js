import { getLocalIp } from "../src/utils/ip";
import { fileURLToPath } from "url";
import path from "path";
// 前端需要访问服务器的静态资源
// 但是局域网内的地址是动态的
// 该脚本负责将当前主机的局域网IP地址写入到前端的环境变量中

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function updateFrontendEnv() {
  const ip = getLocalIp();

  const frontendEnvPath = path.resolve(__dirname, "../../client/.env");

  const file = Bun.file(frontendEnvPath);
  let content = await file.text();

  const newLine = `VITE_SERVER_IP=${ip}`;

  // 检查是否已有 VITE_SERVER_IP= 开头的行
  const regex = /^VITE_SERVER_IP=.*/gm;

  if (content.match(regex)) {
    content = content.replace(regex, newLine);
  } else {
    content = content.trimEnd() + "\n" + newLine;
  }

  await Bun.write(frontendEnvPath, content.trimEnd() + "\n");
}

updateFrontendEnv()
  .then(() => {})
  .catch((err) => {
    console.error("更新 .env 失败:", err);
    process.exit(1);
  });
