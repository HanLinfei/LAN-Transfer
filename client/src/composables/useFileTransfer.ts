import { ref, computed, onMounted, onUnmounted } from "vue";
import type { FileInfo } from "@/types/file";
import type {
  User,
  FileItem,
  TransferTask,
  IncomingTransfer,
} from "@/types/transfer";
import { socketService } from "@/services/socket";
import { webrtcService } from "@/services/webrtc";
import { scheduler } from "@/services/scheduler";
import { formatBytes, randomIdByChar } from "@/lib/utils";

export function useFileTransfer() {
  const currentUser = ref<User | null>(null);
  const allUsers = ref<User[]>([]);
  const users = computed(() => {
    if (!currentUser.value) return allUsers.value;
    return allUsers.value.filter((u) => u.id !== currentUser.value?.id);
  });

  const selectedUserIds = ref<Set<string>>(new Set());
  const files = ref<FileItem[]>([]);
  const transfers = ref<TransferTask[]>([]);
  const incomingTransfers = ref<IncomingTransfer[]>([]);
  const isDragging = ref(false);
  const isTransferring = ref(false);

  const totalSize = computed(() => {
    return files.value.reduce((acc, curr) => acc + curr.file.size, 0);
  });

  const formattedTotalSize = computed(() => formatBytes(totalSize.value));

  const canSend = computed(() => {
    return (
      files.value.length > 0 &&
      selectedUserIds.value.size > 0 &&
      !isTransferring.value
    );
  });

  const selectedUsers = computed(() => {
    return users.value.filter((u) => selectedUserIds.value.has(u.id));
  });

  onMounted(() => {
    socketService.connect();
    socketService.on("user-info", (user: User) => {
      currentUser.value = user;
    });

    socketService.on("user-list", (list: User[]) => {
      const currentUserIds = new Set(list.map((u) => u.id));
      // 如果传输中的任务里的目标用户不在最新列表中
      // 那么就改变状态
      transfers.value.forEach((t) => {
        if (!currentUserIds.has(t.targetUserId) && t.status === "pending") {
          t.status = "rejected";
        }
      });

      // 如果自己收到的的任务里的发送用户不在最新列表中
      // 那么就关闭窗口 无需处理
      incomingTransfers.value = incomingTransfers.value.filter((t) => {
        if (!currentUserIds.has(t.senderId)) {
          return false;
        }
        return true;
      });

      // 如果选中的用户不在最新列表中
      // 那么就从选中里删除 取消选中
      const toRemove: string[] = [];
      selectedUserIds.value.forEach((id) => {
        if (!currentUserIds.has(id)) {
          toRemove.push(id);
        }
      });
      toRemove.forEach((id) => selectedUserIds.value.delete(id));

      allUsers.value = list;
    });

    socketService.on("offer", handleSignal);
    socketService.on("answer", handleSignal);
    socketService.on("ice-candidate", handleSignal);
    // A -> invite -> B
    // B -> accept ? reject -> A
    socketService.on("invite", handleOfferInvite);
    socketService.on("accept", handleOfferAccept);
    socketService.on("reject", handleOfferReject);

    webrtcService.onSenderProgress((userId, fileId, progress) => {
      // Update Sender Progress
      const transfer = transfers.value.find(
        (t) => t.targetUserId === userId && t.fileId === fileId,
      );
      if (transfer) {
        transfer.progress = progress;
        if (progress >= 100) {
          transfer.status = "completed";
        }
      }
    });

    webrtcService.onReceiverProgress((userId, fileId, received) => {
      // Update Receiver Progress
      const incoming = incomingTransfers.value.find(
        (t) => t.senderId === userId && t.status === "receiving",
      );

      if (incoming) {
        if (!(incoming as any).fileProgress) {
          (incoming as any).fileProgress = new Map<string, number>();
        }

        (incoming as any).fileProgress.set(fileId, received);

        let totalReceived = 0;
        ((incoming as any).fileProgress as Map<string, number>).forEach(
          (bytes) => {
            totalReceived += bytes;
          },
        );

        if (incoming.totalSize > 0) {
          incoming.progress = (totalReceived / incoming.totalSize) * 100;
        }

        if (incoming.progress >= 100 || totalReceived >= incoming.totalSize) {
          incoming.progress = 100;
          incoming.status = "completed";
        }
      }
    });

    // Handle WebRTC Connection State Changes
    webrtcService.onConnectionStateChange((userId, state) => {
      if (
        state === "disconnected" ||
        state === "failed" ||
        state === "closed"
      ) {
        // Mark active transfers to/from this user as error
        transfers.value.forEach((t) => {
          if (t.targetUserId === userId && t.status === "transferring") {
            t.status = "error";
          }
        });

        // Also handle incoming transfers if interrupted
        const incoming = incomingTransfers.value.find(
          (t) => t.senderId === userId && t.status === "receiving",
        );
        if (incoming) {
          if (incoming.progress < 100) {
            incoming.status = "declined";
          }
        }
      }
    });
  });

  onUnmounted(() => {
    socketService.off("signal", handleSignal);
    socketService.off("invite", handleOfferInvite);
    socketService.off("accept", handleOfferAccept);
    socketService.off("reject", handleOfferReject);
  });

  function handleSignal(message: {
    sender: string;
    type: "answer" | "offer" | "ice-candidate";
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
  }) {
    const sender = users.value.find((u) => u.id === message.sender);
    if (!sender) return;
    switch (message.type) {
      case "offer":
        webrtcService.handleOffer(
          message.sender,
          message.payload as RTCSessionDescriptionInit,
        );
        break;
      case "answer":
        webrtcService.handleAnswer(
          message.sender,
          message.payload as RTCSessionDescriptionInit,
        );
        break;
      case "ice-candidate":
        webrtcService.handleCandidate(
          message.sender,
          message.payload as RTCIceCandidateInit,
        );
        break;
    }
  }

  function handleOfferInvite(message: {
    sender: string;
    payload: { files: FileInfo[] };
  }) {
    const { sender, payload } = message;
    const user = users.value.find((u) => u.id === sender);
    if (!user) return;

    // 如果此发送者有邀请 那么就合并
    const existingTransfer = incomingTransfers.value.find(
      (t) =>
        t.senderId === sender &&
        (t.status === "pending" || t.status === "receiving"),
    );

    if (existingTransfer) {
      // Merge files
      existingTransfer.files.push(...payload.files);
      // Update total size
      existingTransfer.totalSize += payload.files.reduce(
        (acc, f) => acc + f.size,
        0,
      );
    } else {
      // 每个newTransfer都是一个要接收的任务
      // 每个newTransfer都会显示一个IncomingRequest
      const newTransfer: IncomingTransfer = {
        id: Math.random().toString(36).substring(7),
        senderId: sender,
        files: payload.files,
        totalSize: payload.files.reduce((acc, f) => acc + f.size, 0),
        progress: 0,
        status: "pending",
      };
      incomingTransfers.value.push(newTransfer);
    }
  }

  async function handleOfferAccept(message: { sender: string; payload: any }) {
    const tasks: TransferTask[] = [];
    transfers.value.forEach((t) => {
      if (t.targetUserId === message.sender && t.status === "pending") {
        t.status = "transferring";
        tasks.push(t);
      }
    });

    webrtcService.createConnection(message.sender);
    // WEBRTC连接成功了 开始发送了
    processTasks(message.sender, tasks);
  }

  function handleOfferReject(message: { sender: string; payload: any }) {
    transfers.value.forEach((t) => {
      if (t.targetUserId === message.sender && t.status === "pending") {
        t.status = "rejected";
      }
    });
  }

  function toggleUserSelection(id: string) {
    if (selectedUserIds.value.has(id)) {
      selectedUserIds.value.delete(id);
    } else {
      selectedUserIds.value.add(id);
    }
  }
  // 处理发送任务
  async function processTasks(sender: string, tasks: TransferTask[]) {
    tasks.forEach((task) => {
      scheduler.addTask(
        sender,
        {
          file: task.file,
          fileId: task.fileId,
          size: task.file.size,
        },
        async () => {
          try {
            await webrtcService.sendFile(sender, task.file, task.fileId);
            const t = transfers.value.find((x) => x.fileId === task.fileId);
            if (t) t.status = "completed";
          } catch (error) {
            console.error("Transfer failed", error);
            const t = transfers.value.find((x) => x.fileId === task.fileId);
            if (t) t.status = "error";
          }
        },
      );
    });
  }

  // 将选中的文件添加到待发的队列中
  function addFiles(newFiles: File[]) {
    const newItems: FileItem[] = newFiles.map((f) => {
      return {
        id: randomIdByChar(f.name.charAt(0)),
        file: f,
        size: f.size,
        name: f.name,
        type: f.type,
        status: "queued",
      };
    });
    files.value.push(...newItems);
  }

  function removeFile(id: string) {
    files.value = files.value.filter((f) => f.id !== id);
  }

  // 我开始向接受方发送文件了
  async function startTransfer() {
    if (!canSend.value) return;
    isTransferring.value = true;
    const newTasks: TransferTask[] = [];
    for (const userId of selectedUserIds.value) {
      const fileMetadata = files.value.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
      }));

      socketService.sendSignal(userId, "invite", {
        files: fileMetadata,
        ...(fileMetadata.length === 1 && fileMetadata[0]
          ? // 一个文件的时候会显示详情
            {
              fileName: fileMetadata[0].name,
              fileSize: fileMetadata[0].size,
              fileType: fileMetadata[0].type,
            }
          : {}),
      });

      for (const file of files.value) {
        newTasks.push({
          fileId: file.id,
          name: file.name,
          targetUserId: userId,
          progress: 0,
          status: "pending",
          file: file.file,
        });
      }
    }
    transfers.value = [...transfers.value, ...newTasks];
    isTransferring.value = false;
    // 清空待发送的列表
    files.value = [];
  }

  // 接受了这个任务
  async function acceptTransfer(id: string) {
    const transfer = incomingTransfers.value.find((t) => t.id === id);
    if (!transfer) return;
    // 告诉发送方 我同意你的发送文件请求
    socketService.sendSignal(transfer.senderId, "accept", {});
    transfer.status = "receiving";
  }

  function declineTransfer(id: string) {
    const transfer = incomingTransfers.value.find((t) => t.id === id);
    if (transfer) {
      if (transfer.status === "declined" || transfer.status === "completed") {
        incomingTransfers.value = incomingTransfers.value.filter(
          (t) => t.id !== id,
        );
        return;
      }
      // 告诉发送方 我拒绝了你的发送文件请求
      socketService.sendSignal(transfer.senderId, "reject", {});
      transfer.status = "declined";
      // 删除这个需要自己接受的任务 incomingRequest消失
      incomingTransfers.value = incomingTransfers.value.filter(
        (t) => t.id !== id,
      );
    }
  }

  return {
    currentUser,
    users,
    selectedUserIds,
    selectedUsers,
    files,
    transfers,
    incomingTransfers,
    isDragging,
    isTransferring,
    totalSize,
    formattedTotalSize,
    canSend,
    toggleUserSelection,
    addFiles,
    removeFile,
    startTransfer,
    acceptTransfer,
    declineTransfer,
  };
}
