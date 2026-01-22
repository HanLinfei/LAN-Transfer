import { User } from "../models/User";
import { userStore } from "../models/UserStore";
import { generateUniqueName } from "../utils/nameGenerator";
import { HOST, PORT } from "../config";
export class UserService {
  createUser(id: string, deviceName: string, ip: string): User {
    const name = generateUniqueName();
    const avatarIndex = Math.floor(Math.random() * 30); // 0-29
    const avatar = `https://${HOST}:${PORT}/avatars/adventurer/adventurer-${avatarIndex}.webp`;
    const user: User = {
      id,
      name,
      avatar,
      deviceName,
      ip,
      joinedAt: Date.now(),
    };

    userStore.addUser(user);
    return user;
  }

  removeUser(id: string) {
    userStore.removeUser(id);
  }

  getAllUsers() {
    return userStore.getAllUsers();
  }
}

export const userService = new UserService();
