export interface Vector {
  x: number;
  y: number;
}

export interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export interface Player extends Entity {
  id: 1 | 2;
  score: number;
}

export interface Ball extends Entity {
  lastTouchedBy: 1 | 2 | null;
}

export interface GameDimensions {
  width: number;
  height: number;
}
