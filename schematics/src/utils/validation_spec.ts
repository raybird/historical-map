import { validateEvent, validatePeriod, EventInput, PeriodInput } from './validation';

const periods = [{ id: 'p1' }];
const existingIds = new Set(['e1']);

function baseEvent(): EventInput {
  return {
    id: 'e2', title: 't', description: 'd',
    start: '100', end: '100', period: 'P', periodId: 'p1',
    locationName: 'L', lat: 25, lng: 121,
    adminDivisions: [], categories: [], keywords: [], relatedEvents: [],
  };
}

describe('validateEvent', () => {
  it('passes a valid event', () => {
    expect(validateEvent(baseEvent(), periods, existingIds)).toEqual([]);
  });
  it('rejects duplicate id', () => {
    const e = baseEvent(); e.id = 'e1';
    expect(validateEvent(e, periods, existingIds)).toContain('Duplicate event id: e1');
  });
  it('rejects unknown periodId', () => {
    const e = baseEvent(); e.periodId = 'nope';
    expect(validateEvent(e, periods, existingIds)).toContain('Unknown periodId: nope');
  });
  it('rejects out-of-range latitude', () => {
    const e = baseEvent(); e.lat = 200;
    expect(validateEvent(e, periods, existingIds)).toContain('Latitude out of range: 200');
  });
});

describe('validatePeriod', () => {
  it('rejects bad hex color', () => {
    const p: PeriodInput = { id: 'p2', label: 'L', startYear: 1, endYear: 2, color: 'red', description: '' };
    expect(validatePeriod(p, new Set(['p1']))).toContain('Invalid hex color: red');
  });
  it('rejects endYear < startYear', () => {
    const p: PeriodInput = { id: 'p2', label: 'L', startYear: 5, endYear: 2, color: '#fff', description: '' };
    expect(validatePeriod(p, new Set(['p1']))).toContain('endYear (2) must be >= startYear (5)');
  });
});
