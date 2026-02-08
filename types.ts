
export interface Activity {
  id: string;
  name: string;
  durationSeconds: number;
}

export enum TimerState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  TRANSITION = 'TRANSITION',
}
