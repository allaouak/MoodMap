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

export function formatTime(isoString: string): string {
  return format(parseISO(isoString), "HH:mm");
}
