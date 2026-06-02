export interface EventInput {
  id: string; title: string; description: string;
  start: string; end: string; period: string; periodId: string;
  locationName: string; lat: number; lng: number;
  adminDivisions: string[]; categories: string[]; keywords: string[]; relatedEvents: string[];
}

export interface PeriodInput {
  id: string; label: string; startYear: number; endYear: number; color: string; description: string;
}

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function validateEvent(
  e: EventInput,
  periods: Array<{ id: string }>,
  existingIds: Set<string>,
): string[] {
  const errors: string[] = [];
  if (!e.id) errors.push('Event id is required');
  if (existingIds.has(e.id)) errors.push(`Duplicate event id: ${e.id}`);
  if (!e.title) errors.push('Event title is required');
  if (!periods.some(p => p.id === e.periodId)) errors.push(`Unknown periodId: ${e.periodId}`);
  if (typeof e.lat !== 'number' || e.lat < -90 || e.lat > 90) errors.push(`Latitude out of range: ${e.lat}`);
  if (typeof e.lng !== 'number' || e.lng < -180 || e.lng > 180) errors.push(`Longitude out of range: ${e.lng}`);
  return errors;
}

export function validatePeriod(p: PeriodInput, existingIds: Set<string>): string[] {
  const errors: string[] = [];
  if (!p.id) errors.push('Period id is required');
  if (existingIds.has(p.id)) errors.push(`Duplicate period id: ${p.id}`);
  if (!HEX.test(p.color)) errors.push(`Invalid hex color: ${p.color}`);
  if (p.endYear < p.startYear) errors.push(`endYear (${p.endYear}) must be >= startYear (${p.startYear})`);
  return errors;
}
