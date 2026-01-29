export interface DailyScore {
  date: string;
  score: number;
  maxScore: number;
}

const STORAGE_KEY = 'cycling_imposter_history';

// Haal alle gespeelde dagen op
export const getHistory = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
};

// Sla een resultaat op
export const saveDailyResult = (date: string, score: number) => {
  const history = getHistory();
  history[date] = score; 
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
};

// Check of een datum al gespeeld is
export const hasPlayedDate = (date: string): boolean => {
  const history = getHistory();
  return history[date] !== undefined;
};

// Haal score op
export const getScoreForDate = (date: string): number | null => {
  const history = getHistory();
  return history[date] ?? null;
};