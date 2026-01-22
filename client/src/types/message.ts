import type { User } from "@/types/transfer";
import type { FileInfo } from "@/types/file";
export type ServerMessage =
  | { type: "user-info"; data: User }
  | { type: "user-list"; data: User[] }
  | { type: "invite"; sender: string; payload: FileInfo[] }
  | { type: "accept"; sender: string; payload: any }
  | { type: "reject"; sender: string; payload: any }
  | { type: "offer"; sender: string; payload: any }
  | { type: "answer"; sender: string; payload: any }
  | { type: "ice-candidate"; sender: string; payload: any };
