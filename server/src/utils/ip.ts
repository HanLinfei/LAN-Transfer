import { networkInterfaces } from "os";

// 查找本机的局域网IP地址
export function getLocalIp() {
  const interfaces = networkInterfaces();
  const candidates: { address: string; name: string; weight: number }[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      const isIPv4 = iface.family === "IPv4" || (iface.family as any) === 4;

      if (isIPv4 && !iface.internal) {
        const lowerName = name.toLowerCase();
        let weight = 0;

        if (
          lowerName.includes("docker") ||
          lowerName.includes("veth") ||
          lowerName.includes("tailscale") ||
          lowerName.includes("cni") ||
          lowerName.includes("flannel") ||
          lowerName.includes("br-") ||
          lowerName.includes("vmnet") ||
          lowerName.includes("wsl") ||
          lowerName.includes("tun") ||
          lowerName.includes("tap")
        ) {
          continue;
        }

        if (iface.address.startsWith("192.168.")) weight += 10;
        else if (iface.address.startsWith("10.")) weight += 5;
        else if (iface.address.startsWith("172.")) {
          const parts = iface.address.split(".");
          const second = parseInt(parts[1], 10);
          if (second >= 16 && second <= 31) weight += 5;
        }

        if (
          lowerName.startsWith("en") || // macOS / BSD
          lowerName.startsWith("eth") || // Linux
          lowerName.startsWith("wlan") || // Wi-Fi
          lowerName.startsWith("wi-fi")
        ) {
          weight += 2;
        }

        candidates.push({ address: iface.address, name, weight });
      }
    }
  }

  candidates.sort((a, b) => b.weight - a.weight);

  if (candidates.length > 0) {
    return candidates[0].address;
  }

  return "0.0.0.0";
}
