import { isValidStayRange, nightCount } from './reservation-dates';

describe('reservation dates', () => {
  it('rechaza checkOut <= checkIn', () => {
    expect(isValidStayRange('2026-10-20', '2026-10-20')).toBeFalse();
    expect(isValidStayRange('2026-10-21', '2026-10-20')).toBeFalse();
    expect(nightCount('2026-10-21', '2026-10-20')).toBe(0);
  });

  it('cuenta noches solo con rango válido', () => {
    expect(isValidStayRange('2026-10-20', '2026-10-22')).toBeTrue();
    expect(nightCount('2026-10-20', '2026-10-22')).toBe(2);
  });
});
