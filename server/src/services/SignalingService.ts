import { userStore } from "../models/UserStore";
import { Message } from "../models/User";

export class SignalingService {
  processSignal(senderId: string, message: Message): string | null {
    const { target, type } = message;

    const targetUser = userStore.getUser(target);
    if (!targetUser) {
      return null;
    }

    return `user:${target}`;
  }
}

export const signalingService = new SignalingService();
