import { getLocalIp } from "../utils/ip";
const HOST = getLocalIp();
const PORT = Bun.env.PORT ?? "3000";
export { PORT, HOST };
