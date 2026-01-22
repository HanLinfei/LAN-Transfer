import { socketService } from "./socket";
import streamSaver from "streamsaver";

type PeerConnectionMap = Map<string, RTCPeerConnection>;
type DataChannelMap = Map<string, RTCDataChannel>;

// Protocol Types
interface FileStartMessage {
  type: "file-start";
  id: string;
  name: string;
  size: number;
  mime: string;
}

interface FileEndMessage {
  type: "file-end";
  id: string;
}

export class WebRTCService {
  private peers: PeerConnectionMap = new Map();
  private dataChannels: DataChannelMap = new Map();
  private onDataChannelCallback:
    | ((userId: string, channel: RTCDataChannel) => void)
    | null = null;
  private onSenderProgressCallback:
    | ((userId: string, fileId: string, progress: number) => void)
    | null = null;
  private onReceiverProgressCallback:
    | ((userId: string, fileId: string, progress: number) => void)
    | null = null;
  private onConnectionStateChangeCallback:
    | ((userId: string, state: RTCPeerConnectionState) => void)
    | null = null;

  // 文件id映射本地写入器
  // 应对多并发的情况
  private currentWriters: Map<string, WritableStreamDefaultWriter> = new Map();
  private currentFileMeta: Map<
    string,
    { id: string; size: number; received: number }
  > = new Map();

  // 跟目标用户建立连接WebRTC连接
  async createConnection(targetUserId: string) {
    if (this.peers.has(targetUserId)) {
      console.warn(`Connection to ${targetUserId} already exists`);
      return;
    }
    const pc = this.createPeer(targetUserId);
    const dc = pc.createDataChannel("file-transfer");
    this.setupDataChannel(targetUserId, dc);
    // Create Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    // Send Offer
    socketService.sendSignal(targetUserId, "offer", offer);
  }

  private async sendData(dc: RTCDataChannel, data: string | ArrayBuffer) {
    // 如果缓冲区到达 1MB
    // 则阻塞 等待缓冲区数据被清空
    if (dc.bufferedAmount > 1024 * 1024 * 2) {
      await new Promise<void>((resolve) => {
        const handler = () => {
          dc.removeEventListener("bufferedamountlow", handler);
          resolve();
        };
        dc.addEventListener("bufferedamountlow", handler);
      });
    }

    try {
      dc.send(data);
    } catch (err: any) {
      console.log(err);
      // 但还是要再次确认一下 看是否是队列已满的错误 不过上述的检查应该能够避免这种情况的发生
      if (err.name === "OperationError" && dc.bufferedAmount > 0) {
        // 等待一会儿再次尝试 还是放弃？
        await new Promise<void>((resolve) => {
          const handler = () => {
            dc.removeEventListener("bufferedamountlow", handler);
            resolve();
          };
          dc.addEventListener("bufferedamountlow", handler);
        });
        dc.send(data);
      } else {
        throw err;
      }
    }
  }

  async sendFile(userId: string, file: File, fileId: string) {
    const dc = await this.getDataChannel(userId);

    if (!dc) {
      throw new Error(`No data channel for user ${userId}`);
    }

    // 如果没有打开 那么阻塞 发送文件
    if (dc.readyState !== "open") {
      await new Promise<void>((resolve) => {
        const handler = () => {
          dc.removeEventListener("open", handler);
          resolve();
        };
        dc.addEventListener("open", handler);
      });
    }

    // 缓冲区最低水位线
    dc.bufferedAmountLowThreshold = 1024 * 64; // 64KB

    // 文件信息
    const startMsg: FileStartMessage = {
      type: "file-start",
      id: fileId,
      name: file.name,
      size: file.size,
      mime: file.type,
    };

    // sendData用于安全的发送数据
    await this.sendData(dc, JSON.stringify(startMsg));

    // Send chunks
    const chunkSize = 128 * 1024; // 64KB
    let offset = 0;
    const reader = file.stream().getReader();
    const encoder = new TextEncoder();
    const fileIdBytes = encoder.encode(fileId);
    const fileIdLen = fileIdBytes.length;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        let buffer = value;
        let position = 0;

        while (position < buffer.length) {
          // 要么切满 chunkSize 要么切到 buffer 末尾（如果剩下的不够 chunkSize）
          const end = Math.min(position + chunkSize, buffer.length);
          const chunk = buffer.subarray(position, end);

          const packet = new Uint8Array(1 + fileIdLen + chunk.length);
          // 第1字节：fileId的长度
          packet[0] = fileIdLen;
          // 然后将fileid的字节放进去
          packet.set(fileIdBytes, 1);
          // 所有文件的内容
          packet.set(chunk, 1 + fileIdLen);
          await this.sendData(dc, packet as unknown as ArrayBuffer);

          position = end;
          offset += chunk.length;

          if (this.onSenderProgressCallback) {
            this.onSenderProgressCallback(
              userId,
              fileId,
              (offset / file.size) * 100,
            );
          }
        }
      }

      const endMsg: FileEndMessage = { type: "file-end", id: fileId };
      await this.sendData(dc, JSON.stringify(endMsg));
    } catch (err) {
      console.error("Error sending file", err);
      throw err;
    } finally {
      reader.releaseLock();
    }
  }

  // Helper to wait for DC to be ready
  private getDataChannel(userId: string): Promise<RTCDataChannel | undefined> {
    return new Promise((resolve) => {
      const dc = this.dataChannels.get(userId);
      if (dc && dc.readyState === "open") {
        resolve(dc);
      } else if (dc) {
        // If pending, just wait for open
        const onOpen = () => {
          dc.removeEventListener("open", onOpen);
          resolve(dc);
        };
        dc.addEventListener("open", onOpen);
      } else {
        // Wait a bit or resolve undefined if connection fails
        // In a real app, we might need a PendingConnection queue
        setTimeout(() => resolve(this.dataChannels.get(userId)), 2000);
      }
    });
  }

  // Called when we receive an offer (Receiver)
  async handleOffer(senderId: string, offer: RTCSessionDescriptionInit) {
    const pc = this.createPeer(senderId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    // Send Answer
    socketService.sendSignal(senderId, "answer", answer);
  }

  // Called when we receive an answer (Initiator)
  async handleAnswer(senderId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peers.get(senderId);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  // Called when we receive an ICE candidate
  async handleCandidate(senderId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peers.get(senderId);
    if (!pc) return;
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private createPeer(userId: string): RTCPeerConnection {
    // Use public STUN servers
    const config: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };
    const pc = new RTCPeerConnection(config);
    // 对端 -> DataChanel
    this.peers.set(userId, pc);
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendSignal(userId, "ice-candidate", event.candidate);
      }
    };
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}: ${pc.connectionState}`);
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(userId, pc.connectionState);
      }
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        this.closeConnection(userId);
      }
    };
    // Handle Data Channel (Receiver side)
    pc.ondatachannel = (event) => {
      this.setupDataChannel(userId, event.channel);
    };
    return pc;
  }

  private setupDataChannel(userId: string, dc: RTCDataChannel) {
    this.dataChannels.set(userId, dc);
    dc.onopen = () => {
      console.log(`Data channel with ${userId} open`);
      if (this.onDataChannelCallback) {
        this.onDataChannelCallback(userId, dc);
      }
    };
    dc.onmessage = async (event) => {
      const { data } = event;

      if (typeof data === "string") {
        // (JSON)
        try {
          const msg = JSON.parse(data);
          if (msg.type === "file-start") {
            const startMsg = msg as FileStartMessage;
            console.log("Received file-start:", startMsg);

            // Create StreamSaver
            const fileStream = streamSaver.createWriteStream(startMsg.name, {
              size: startMsg.size,
            });
            const writer = fileStream.getWriter();
            this.currentWriters.set(startMsg.id, writer);
            this.currentFileMeta.set(startMsg.id, {
              id: startMsg.id,
              size: startMsg.size,
              received: 0,
            });
          } else if (msg.type === "file-end") {
            const endMsg = msg as FileEndMessage;
            const writer = this.currentWriters.get(endMsg.id);
            if (writer) {
              await writer.close();
              this.currentWriters.delete(endMsg.id);
              this.currentFileMeta.delete(endMsg.id);
            }
          }
        } catch (e) {
          console.error("Failed to parse control message", e);
        }
      } else {
        const buffer = new Uint8Array(data);
        const idLen = buffer[0];
        const decoder = new TextDecoder();
        // 读取fileId的长度的内容 拿到fileId
        const fileId = decoder.decode(buffer.subarray(1, 1 + idLen!));
        const chunkData = buffer.subarray(1 + idLen!);

        // 通过fileId获取写入器与文件信息
        const writer = this.currentWriters.get(fileId);
        const meta = this.currentFileMeta.get(fileId);

        if (writer && meta) {
          await writer.write(chunkData);
          meta.received += chunkData.byteLength;

          if (this.onReceiverProgressCallback) {
            this.onReceiverProgressCallback(
              userId,
              meta.id,
              (meta.received / meta.size) * 100,
            );
          }
        }
      }
    };

    dc.onclose = () => {
      console.log(`Data channel with ${userId} closed`);
    };
  }

  closeConnection(userId: string) {
    const pc = this.peers.get(userId);
    if (pc) {
      pc.close();
      this.peers.delete(userId);
    }
    const dc = this.dataChannels.get(userId);
    if (dc) {
      dc.close();
      this.dataChannels.delete(userId);
    }
  }

  onDataChannel(callback: (userId: string, channel: RTCDataChannel) => void) {
    this.onDataChannelCallback = callback;
  }

  onProgress(
    type: "sender" | "receiver",
    callback: (userId: string, fileId: string, progress: number) => void,
  ) {
    if (type === "sender") {
      this.onSenderProgressCallback = callback;
    } else {
      this.onReceiverProgressCallback = callback;
    }
  }

  onConnectionStateChange(
    callback: (userId: string, state: RTCPeerConnectionState) => void,
  ) {
    this.onConnectionStateChangeCallback = callback;
  }
}

export const webrtcService = new WebRTCService();
