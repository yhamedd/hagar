/**
 * Convert a 24h time string like "13:00" or "13:00:00" to "1:00 PM"
 * Returns empty string for invalid input
 */
export function formatTime12h(time24: string | null | undefined): string {
  if (!time24 || typeof time24 !== "string") return "";
  
  const parts = time24.split(":");
  if (parts.length < 2) return time24;
  
  const hoursNum = parseInt(parts[0], 10);
  if (isNaN(hoursNum)) return time24;
  
  const minutes = parts[1].substring(0, 2); // Handle "HH:mm:ss" format
  const ampm = hoursNum >= 12 ? "PM" : "AM";
  const hours = hoursNum % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}
