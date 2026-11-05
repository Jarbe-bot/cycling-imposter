// Lokale datum van de speler als YYYY-MM-DD.
// Valt samen met de countdown (middernacht lokale tijd), in tegenstelling tot toISOString() dat UTC gebruikt.
export const getLocalDate = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
