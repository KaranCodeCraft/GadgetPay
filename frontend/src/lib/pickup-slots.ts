export const PICKUP_TIME_ZONE = "Asia/Kolkata";

export const PICKUP_TIME_SLOTS = [
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 1:00 PM",
  "1:00 PM - 2:00 PM",
  "2:00 PM - 3:00 PM",
  "3:00 PM - 4:00 PM",
  "4:00 PM - 5:00 PM",
  "5:00 PM - 6:00 PM",
];

export function getDateKeyInTimeZone(date: Date, timeZone = PICKUP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "00";
  const day = parts.find((part) => part.type === "day")?.value || "00";
  return `${year}-${month}-${day}`;
}

function getHourMinuteInTimeZone(date: Date, timeZone = PICKUP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value || "0");
  return { hour, minute };
}

export function parsePickupTimeSlotBoundary(timeSlot: string, boundary: "start" | "end" = "start") {
  const parts = String(timeSlot || "").split("-").map((part) => part.trim()).filter(Boolean);
  const selected = boundary === "end" ? parts[1] : parts[0];
  const match = selected?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  const hourRaw = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  const hour = (hourRaw % 12) + (meridiem === "PM" ? 12 : 0);

  return { hour, minute };
}

export function isTimeSlotAvailableForDate(dateInput: Date | string | undefined, timeSlot: string, now = new Date()) {
  if (!PICKUP_TIME_SLOTS.includes(timeSlot)) return false;
  if (!dateInput) return true;

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return false;

  const selectedDateKey = getDateKeyInTimeZone(date);
  const todayKey = getDateKeyInTimeZone(now);
  if (selectedDateKey !== todayKey) return true;

  const slotStart = parsePickupTimeSlotBoundary(timeSlot, "start");
  if (!slotStart) return false;

  const currentTime = getHourMinuteInTimeZone(now);
  const slotMinutes = slotStart.hour * 60 + slotStart.minute;
  const currentMinutes = currentTime.hour * 60 + currentTime.minute;
  return slotMinutes > currentMinutes;
}

export function getAvailableTimeSlotsForDate(dateInput: Date | string | undefined, now = new Date()) {
  return PICKUP_TIME_SLOTS.filter((slot) => isTimeSlotAvailableForDate(dateInput, slot, now));
}