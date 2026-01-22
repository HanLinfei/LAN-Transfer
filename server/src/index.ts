import { Elysia } from "elysia";
import { HOST, PORT } from "./config/index";
import { staticPlugin } from "@elysiajs/static";
import { cors } from "@elysiajs/cors";
import { wsController } from "./controllers/ws";
import path from "path";

export let serverReady: Promise<void>;
new Elysia()
  .use(cors())
  .use(
    staticPlugin({
      assets: "public",
      prefix: "/",
    }),
  )
  .use(wsController)
  .head("/", () => new Response(null, { status: 200 }))
  .listen(
    {
      port: PORT,
      hostname: HOST,
      tls: {
        key: Bun.file(path.resolve(__dirname, "../cert/server.key")),
        cert: Bun.file(path.resolve(__dirname, "../cert/server.crt")),
        rejectUnauthorized: false, // 不开启证书校验
        requestCert: true, // 请求时不校验证书
      },
    },
    async () => {
      serverReady = Promise.resolve();
      const ip = HOST;
      console.log(`Server is running at:`);
      console.log(`  - Network: https://${ip}:${PORT}`);
    },
  );
