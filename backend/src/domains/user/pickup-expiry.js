export const PICKUP_CUTOFF_TIME_ZONE = "Asia/Kolkata";
export const AUTO_EXPIRED_PICKUP_REASON = "AUTO_EXPIRED_PICKUP_SLOT";
export const AUTO_EXPIRED_ALL_SLOTS_REASON = "AUTO_EXPIRED_ALL_SLOTS";

export function getDateKeyInTimeZone(date, timeZone = PICKUP_CUTOFF_TIME_ZONE) {
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

export function getHourMinuteInTimeZone(date, timeZone = PICKUP_CUTOFF_TIME_ZONE) {
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

export function parsePickupSlotBoundary(timeSlot, boundary) {
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

export function hasSameDayPickupSlotPassed(dateValue, timeSlot, now = new Date()) {
  const selectedDateKey = getDateKeyInTimeZone(new Date(dateValue), PICKUP_CUTOFF_TIME_ZONE);
  const todayKey = getDateKeyInTimeZone(now, PICKUP_CUTOFF_TIME_ZONE);
  if (selectedDateKey !== todayKey) return false;

  const slotStart = parsePickupSlotBoundary(timeSlot, "start");
  if (!slotStart) return true;

  const currentTime = getHourMinuteInTimeZone(now, PICKUP_CUTOFF_TIME_ZONE);
  const slotMinutes = slotStart.hour * 60 + slotStart.minute;
  const currentMinutes = currentTime.hour * 60 + currentTime.minute;
  return slotMinutes <= currentMinutes;
}

export function getPickupSlotEndUtc(dateValue, timeSlot) {
  if (!dateValue || !timeSlot) return null;

  const dateKey = getDateKeyInTimeZone(new Date(dateValue), PICKUP_CUTOFF_TIME_ZONE);
  const dateMatch = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const slotEnd = parsePickupSlotBoundary(timeSlot, "end");
  if (!dateMatch || !slotEnd) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const utcMs = Date.UTC(year, month - 1, day, slotEnd.hour - 5, slotEnd.minute - 30, 0, 0);
  return new Date(utcMs);
}

export function getPickupExpiryDecision(pickupSchedule) {
  if (!pickupSchedule) return null;

  const primaryEndUtc = getPickupSlotEndUtc(pickupSchedule.primaryDate, pickupSchedule.primaryTime);
  if (!primaryEndUtc) return null;

  const alternateEndUtc = getPickupSlotEndUtc(pickupSchedule.alternateDate, pickupSchedule.alternateTime);
  if (!alternateEndUtc) {
    return {
      expiresAt: primaryEndUtc,
      reason: AUTO_EXPIRED_PICKUP_REASON,
      usesAlternateSlot: false,
      primaryEndUtc,
      alternateEndUtc: null,
    };
  }

  return {
    expiresAt: alternateEndUtc.getTime() > primaryEndUtc.getTime() ? alternateEndUtc : primaryEndUtc,
    reason: AUTO_EXPIRED_ALL_SLOTS_REASON,
    usesAlternateSlot: true,
    primaryEndUtc,
    alternateEndUtc,
  };
}