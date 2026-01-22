import { getOS } from "@/lib/deviceOS";
import type { ServerMessage } from "@/types/message";
export class SocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Function[]> = new Map();
  private url: string;

  constructor() {
    this.url = `wss://${import.meta.env.VITE_SERVER_IP}:4927/ws`;
  }

  connect() {
    if (this.ws) return;
    const deviceName = getOS();
    const wsUrl = new URL(this.url);
    wsUrl.searchParams.set("deviceName", deviceName);

    this.ws = new WebSocket(wsUrl.toString());
    this.ws.onopen = () => {
      console.log("Connected to signaling server");
      this.emit("connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    };

    this.ws.onclose = () => {
      console.log("Disconnected from signaling server");
      this.ws = null;
      this.emit("disconnected");
      // Simple reconnect logic
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  private handleMessage(message: ServerMessage) {
    switch (message.type) {
      case "user-info":
        this.emit("user-info", message.data);
        break;
      case "user-list":
        this.emit("user-list", message.data);
        break;
      case "offer":
      case "answer":
      case "ice-candidate":
        this.emit(message.type, {
          sender: message.sender,
          type: message.type,
          payload: message.payload,
        });
        break;
      case "invite":
      case "accept":
      case "reject":
        this.emit(message.type, {
          sender: message.sender,
          payload: message.payload,
        });
        break;
    }
  }

  sendSignal(target: string, type: string, payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type,
          target,
          payload,
        }),
      );
    } else {
      console.warn("Socket not open, cannot send signal");
    }
  }

  on(event: string, handler: Function) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)?.push(handler);
  }

  off(event: string, handler: Function) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      this.handlers.set(
        event,
        handlers.filter((h) => h !== handler),
      );
    }
  }

  private emit(event: string, data?: any) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((h) => h(data));
    }
  }
}

export const socketService = new SocketService();
