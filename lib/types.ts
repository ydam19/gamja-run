export type Slot = 'head' | 'face' | 'neck';

export interface Item {
  id: string;
  name: string;
  slot: Slot;
  need: number; // 열리는 최고 기록(m)
  price: number; // 지폐
  sort: number;
}

export interface Profile {
  id: string;
  nickname: string | null;
  bills: number;
  best: number;
  plays: number;
  owned: string[];
  wear: Partial<Record<Slot, string>>;
}

export interface LeaderRow {
  rank: number;
  nickname: string;
  best: number;
}

export interface Leaderboard {
  top: LeaderRow[];
  me: { nickname: string | null; best: number; rank: number | null } | null;
}

declare global {
  interface Window {
    __inApp?: boolean;
    __openChrome?: () => void;
  }
}
