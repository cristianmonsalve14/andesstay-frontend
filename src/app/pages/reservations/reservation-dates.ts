/** Noches entre llegada y salida. 0 si faltan fechas o el rango no es válido. */
export function nightCount(checkIn: string, checkOut: string): number {
  if (!isValidStayRange(checkIn, checkOut)) {
    return 0;
  }
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/** checkOut debe ser estrictamente posterior a checkIn. */
export function isValidStayRange(checkIn: string, checkOut: string): boolean {
  if (!checkIn || !checkOut) {
    return false;
  }
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }
  return end.getTime() > start.getTime();
}
