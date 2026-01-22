export interface User {
  id: string;
  name: string;
  avatar: string;
  deviceName: string;
  ip: string;
  joinedAt: number;
}

export type Message =
  | { type: "invite"; target: string; payload: any }
  | { type: "accept"; target: string; payload: any }
  | { type: "reject"; target: string; payload: any }
  | { type: "offer"; target: string; payload: any }
  | { type: "answer"; target: string; payload: any }
  | { type: "ice-candidate"; target: string; payload: any };
