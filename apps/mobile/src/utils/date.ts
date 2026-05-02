import { format, isToday, isYesterday, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export function formatEntryDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  return format(date, "EEEE d MMMM", { locale: fr });
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

// Renvoie YYYY-MM-DD dans la timezone du profil utilisateur.
// Utilise Intl (intégré, pas de dépendance) — en-CA produit le format ISO natif.
export function todayISOInTimezone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  } catch {
    return format(new Date(), "yyyy-MM-dd");
  }
}

export function formatTime(isoString: string): string {
  return format(parseISO(isoString), "HH:mm");
}
