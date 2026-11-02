export type GameState = 'title' | 'play' | 'over';

export interface RunEnd {
  distance: number; // m
  bills: number; // 이번 판에 주운 지폐
  message: string; // 끝난 이유 문구
}

export interface GameOptions {
  images: { calm: string; cry: string };
  hud?: { dist?: HTMLElement | null; bills?: HTMLElement | null };
  onEnd?: (result: RunEnd) => void;
  font?: string;
}

export interface Game {
  start(): void;
  setOutfit(list: { calm: string; cry: string; layer?: 'front' | 'back'; flap?: number }[]): void;
  refreshTheme(): void;
  destroy(): void;
  getState(): GameState;
}

export function createGame(canvas: HTMLCanvasElement, opts: GameOptions): Game;
