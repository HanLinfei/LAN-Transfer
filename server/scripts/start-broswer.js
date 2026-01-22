import { getLocalIp } from "../src/utils/ip";
import { PORT } from "../src/config/index";

const isProduction = Bun.env.NODE_ENV === "production";
const forceOpen = Bun.env.FORCE_OPEN_BROWSER === "true";

if (!isProduction && !forceOpen) {
  process.exit(0);
}

const ip = getLocalIp();
const url = `https://${ip}:${PORT}`;

async function checkServer() {
  const maxRetries = 50;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        tls: {
          rejectUnauthorized: false,
        },
      });

      if (response.ok) {
        return true;
      }
    } catch (e) {}

    await Bun.sleep(200);
    retries++;
  }
  return false;
}

async function openBrowser() {
  const os = process.platform;
  let cmd = [];

  if (os === "darwin") {
    const chromeExists = await Bun.file(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ).exists();
    if (chromeExists) {
      cmd = [
        "open",
        "-a",
        "Google Chrome",
        "--args",
        "--ignore-certificate-errors",
        url,
      ];
    } else {
      // Fallback to Safari
      cmd = ["open", "-a", "Safari", url];
    }
  } else if (os === "win32") {
    try {
      // 尝试查找 Chrome
      const proc = Bun.spawn(["where", "chrome"], {
        stdout: "null",
        stderr: "null",
      });
      await proc.exited;
      if (proc.exitCode === 0) {
        cmd = [
          "cmd",
          "/c",
          "start",
          "chrome",
          "--ignore-certificate-errors",
          url,
        ];
      } else {
        cmd = ["cmd", "/c", "start", "msedge", url];
      }
    } catch {
      cmd = ["cmd", "/c", "start", "msedge", url];
    }
  } else {
    cmd = ["xdg-open", url];
  }

  if (cmd.length > 0) {
    Bun.spawn(cmd, {
      stdout: "ignore",
      stderr: "ignore",
      unref: true,
    });
  }
}

const isReady = await checkServer();

if (isReady) {
  await openBrowser();
} else {
  console.error("Server start timeout. Browser not opened.");
  process.exit(1);
}
