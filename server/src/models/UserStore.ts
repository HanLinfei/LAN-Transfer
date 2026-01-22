import { User } from './User';

class UserStore {
  private users: Map<string, User> = new Map();

  addUser(user: User) {
    this.users.set(user.id, user);
  }

  removeUser(id: string) {
    this.users.delete(id);
  }

  getUser(id: string) {
    return this.users.get(id);
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }
}

export const userStore = new UserStore();
