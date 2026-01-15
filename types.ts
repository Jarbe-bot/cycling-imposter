
export interface Cyclist {
  id: string;
  name: string;
  imageUrl: string;
  country: string;
  team: string;
  status: 'active' | 'retired';
  lastUpdated?: string;
}

export interface QuizSlot {
  cyclistId: string;
  isImposter: boolean;
}

export interface Quiz {
  id: string;
  date: string;
  statement: string;
  slots: QuizSlot[];
  isLive: boolean;
}

export interface UserStats {
  played: number;
  streak: number;
  history: Record<number, number>; // score -> frequency
}

export type ViewState = 'player' | 'login' | 'admin_dashboard' | 'admin_database';
