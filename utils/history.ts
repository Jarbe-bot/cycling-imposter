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

// --- NIEUW: Migratie functie voor oude spelers ---
export const migrateLegacyData = () => {
    // Check of er nog data van het "oude systeem" is
    const legacyDate = localStorage.getItem('last_played_date');
    const legacyScore = localStorage.getItem('last_played_score');

    if (legacyDate && legacyScore) {
        // Als deze datum nog NIET in het nieuwe systeem staat, voeg hem toe
        if (!hasPlayedDate(legacyDate)) {
            console.log("Migrating legacy score for:", legacyDate);
            saveDailyResult(legacyDate, parseInt(legacyScore));
        }
    }
};