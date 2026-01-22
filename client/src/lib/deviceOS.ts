type OS = "Windows" | "Mac" | "iOS" | "Android" | "Linux" | "Unknown";

export function getOS(): OS {
  const uaData = (navigator as any).userAgentData;
  if (uaData && Array.isArray(uaData.platform)) {
    const p = uaData.platform.toLowerCase();
    if (p.includes("windows")) return "Windows";
    if (p.includes("mac")) return "Mac";
    if (p.includes("android")) return "Android";
    if (p.includes("ios")) return "iOS";
    if (p.includes("linux")) return "Linux";
  }

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
  if (ua.includes("mac os x")) return "Mac";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("linux")) return "Linux";

  return "Unknown";
}
