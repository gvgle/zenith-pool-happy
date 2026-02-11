
export type Vector = {
  x: number;
  y: number;
};

export enum GameMode {
  PvP = 'PVP',
  PvE = 'PVE',
  EvE = 'EVE'
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}

export interface Ball {
  id: number;
  position: Vector;
  velocity: Vector;
  radius: number;
  color: string;
  isStriped: boolean;
  number: number;
  inPocket: boolean;
}

export interface Pocket {
  position: Vector;
  radius: number;
}

export interface GameState {
  balls: Ball[];
  cueBall: Ball;
  currentPlayer: number;
  status: GameStatus;
  mode: GameMode;
  scores: [number, number];
  isMoving: boolean;
  pottedThisShot: boolean; // 记录本次击球是否有球进洞
  winner: number | null;
}
