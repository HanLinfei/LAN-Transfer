import { Elysia, t } from "elysia";
import { userService } from "../services/UserService";
import { signalingService } from "../services/SignalingService";
import type { Message } from "../models/User";
export const wsController = new Elysia().ws("/ws", {
  query: t.Object({
    deviceName: t.Optional(t.String()),
  }),
  open(ws) {
    const deviceName = ws.data.query.deviceName || "Unknown Device";
    const user = userService.createUser(ws.id, deviceName, ws.remoteAddress);
    ws.subscribe(`user:${user.id}`);
    ws.subscribe("global-updates");
    console.log(`User joined: ${user.name} (${user.id})`);
    ws.send({
      type: "user-info",
      data: user,
    });

    const users = userService.getAllUsers();
    ws.publish("global-updates", {
      type: "user-list",
      data: users,
    });
    ws.send({
      type: "user-list",
      data: users,
    });
  },

  message(ws, message: Message) {
    if (message.target && message.type) {
      const { target, payload } = message;
      // 转发给目标用户
      const targetTopic = signalingService.processSignal(ws.id, {
        target,
        type: message.type,
        payload,
      });
      if (targetTopic) {
        ws.publish(targetTopic, {
          type: message.type,
          sender: ws.id,
          payload,
        });
      }
    }
  },

  close(ws) {
    console.log(`User left: ${ws.id}`);
    userService.removeUser(ws.id);

    // Broadcast new list
    const users = userService.getAllUsers();
    ws.publish("global-updates", {
      type: "user-list",
      data: users,
    });
  },
});
