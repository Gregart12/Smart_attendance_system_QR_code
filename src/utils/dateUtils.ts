import { format, parseISO, isToday, isThisWeek, isThisMonth } from 'date-fns';

export function formatDate(dateString: string | number | Date, formatPattern = 'MMM dd, yyyy'): string {
  try {
    const d = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    return format(d, formatPattern);
  } catch {
    return String(dateString);
  }
}

export function formatTime(timeString: string | number | Date, formatPattern = 'hh:mm a'): string {
  try {
    // Branch on the presence of a time separator, not on string length: the app
    // stores "HH:mm:ss" (9 chars) which is not reliably parseable on its own.
    const isTimeOnly = typeof timeString === 'string' && timeString.trim().includes(':');
    const d = isTimeOnly
      ? new Date(`2026-01-01T${timeString.trim()}`)
      : typeof timeString === 'string'
        ? parseISO(timeString)
        : new Date(timeString);

    if (Number.isNaN(d.getTime())) return String(timeString);
    return format(d, formatPattern);
  } catch {
    return String(timeString);
  }
}

export function getCurrentDateFormatted(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getCurrentTimeFormatted(): string {
  return format(new Date(), 'HH:mm:ss');
}

/** Local calendar day as YYYY-MM-DD. Never use toISOString() for this: it is UTC. */
export function getDateKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

/** True when a YYYY-MM-DD record date falls inside the requested report period. */
export function isDateInPeriod(
  recordDate: string,
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  now: Date = new Date()
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(recordDate)) return false;

  const record = parseISO(recordDate);
  if (Number.isNaN(record.getTime())) return false;

  switch (period) {
    case 'daily':
      return isToday(record);
    case 'weekly':
      return isThisWeek(record, { weekStartsOn: 1 });
    case 'monthly':
      return isThisMonth(record);
    case 'yearly':
      return record.getFullYear() === now.getFullYear();
    default:
      return false;
  }
}

export function isDateToday(dateString: string): boolean {
  try {
    return isToday(parseISO(dateString));
  } catch {
    return false;
  }
}

export function isDateThisWeek(dateString: string): boolean {
  try {
    return isThisWeek(parseISO(dateString));
  } catch {
    return false;
  }
}

export function isDateThisMonth(dateString: string): boolean {
  try {
    return isThisMonth(parseISO(dateString));
  } catch {
    return false;
  }
}
