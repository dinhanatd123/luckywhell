export type ThemeMode = 'cyber' | 'gala' | 'light';

export type ManagementTab = 'participants' | 'prizes' | 'winners';

export interface Participant {
  id: string;
  name: string;
  active: boolean;
  order: number;
  createdAt?: string;
}

export interface Prize {
  id: string;
  name: string;
  reward: string;
  totalQuantity: number;
  remainingQuantity: number;
  order: number;
}

export interface WinnerRecord {
  id: string;
  participantId: string;
  participantName: string;
  prizeId: string;
  prizeName: string;
  prizeReward: string;
  awardedAt: string;
}

export interface EventWorkspace {
  id: string;
  title: string;
  theme: ThemeMode;
  spinDuration: number;
  autoRemoveWinner: boolean;
  selectedPrizeId: string;
  participants: Participant[];
  prizes: Prize[];
  winners: WinnerRecord[];
  updatedAt: string;
}

export interface CloudEventSummary {
  id: string;
  title: string;
  theme: ThemeMode;
  updatedAt?: string;
}
