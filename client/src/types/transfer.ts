export interface User {
  id: string;
  name: string;
  deviceName: string;
  avatar: string;
}

export interface FileItem {
  id: string;
  file: File;
  size: number;
  name: string;
  type: string;
}

export interface TransferTask {
  name: string;
  fileId: string;
  targetUserId: string;
  progress: number;
  status: "pending" | "transferring" | "completed" | "error" | "rejected";
  speed?: string;
  file: File;
}

export interface IncomingTransfer {
  id: string;
  senderId: string;
  files: { name: string; size: number }[];
  totalSize: number;
  progress: number;
  status: "pending" | "receiving" | "completed" | "declined";
}
