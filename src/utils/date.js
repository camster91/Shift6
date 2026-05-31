/** Get a YYYY-MM-DD string representing *today* in the user's local timezone. */
export function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Convert an ISO-ish or Date object into local YYYY-MM-DD. */
export function toLocalDateString(dateInput) {
  if (typeof dateInput === 'string' && dateInput.length >= 10) {
    if (dateInput.includes('T')) {
      const d = new Date(dateInput);
      return getLocalDateString(d);
    }
    return dateInput.slice(0, 10);
  }
  if (dateInput instanceof Date) {
    return getLocalDateString(dateInput);
  }
  return dateInput;
}
