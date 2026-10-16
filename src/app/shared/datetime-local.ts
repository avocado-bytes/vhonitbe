const pad = (value: number) => String(value).padStart(2, '0');

/** Formats a date as the local "YYYY-MM-DDTHH:mm" value used by `<input type="datetime-local">` */
export function toDateTimeLocal(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Converts a local `datetime-local` value to an ISO 8601 timestamp, or `null` if it is empty or invalid */
export function fromDateTimeLocal(value: string): string | null {
  // Date-time strings without a time zone are parsed as local time
  const date = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(value) ? new Date(value) : null;
  return date && !isNaN(date.getTime()) ? date.toISOString() : null;
}
