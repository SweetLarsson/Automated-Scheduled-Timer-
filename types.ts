
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

export enum ControlAction {
  PLAY_PAUSE = 'PLAY_PAUSE',
  PREVIOUS = 'PREVIOUS',
  NEXT = 'NEXT',
  CLEAR = 'CLEAR',
  RESET = 'RESET',
  ADJUST_TIME = 'ADJUST_TIME',
  INCREMENT = 'INCREMENT',
  DECREMENT = 'DECREMENT',
  UPDATE_NAME = 'UPDATE_NAME',
}

export type Theme = 'dark' | 'light';

export type AlertSound = 'beep' | 'whistle' | 'chime' | 'pulse' | 'digital';

export interface AppSettings {
  theme: Theme;
  enableBeeps: boolean;
  milestoneNotificationTime: number;
  alertSound: AlertSound;
  enableVoice: boolean;
  voiceGender: 'male' | 'female';
}
