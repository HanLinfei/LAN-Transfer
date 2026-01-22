import { spawn } from "bun";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildFrontend() {
  const frontendDir = path.resolve(__dirname, "../../client");

  try {
    const proc = spawn(["bun", "run", "build"], {
      cwd: frontendDir,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env },
    });

    proc.stdout?.pipeTo(
      new WritableStream({
        write(chunk) {
          process.stdout.write(chunk);
        },
      }),
    );

    proc.stderr?.pipeTo(
      new WritableStream({
        write(chunk) {
          process.stderr.write(chunk);
        },
      }),
    );

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      console.log("\n前端打包完成！");
    } else {
      throw new Error(`bun run build Error: ${exitCode}`);
    }
  } catch (error) {
    console.error("前端打包失败：", error);
    throw error;
  }
}

buildFrontend()
  .then(() => {})
  .catch((err) => {
    console.error("构建流程出错", err);
    process.exit(1);
  });
