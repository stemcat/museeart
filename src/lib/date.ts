const parisDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
});

/** The museum's day is the Europe/Paris calendar date, as YYYY-MM-DD. */
export function parisToday(): string {
  return parisDate.format(new Date());
}

export function isValidDateParam(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function formatDisplayDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
