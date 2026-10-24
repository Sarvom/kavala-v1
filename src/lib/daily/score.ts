import { latLngToCell, getResolution } from "h3-js";
import { cellsNear } from "../geo/cells";
import { haversineMetres } from "../geo/filter";

export type Square = "green" | "yellow" | "orange" | "grey";

/** Spot points: 1000 for a perfect guess, falling off with distance. */
export function spotPoints(distanceMetres: number, scaleMetres = 500): number {
  if (!Number.isFinite(distanceMetres) || distanceMetres < 0) return 0;
  return Math.round(1000 * Math.exp(-distanceMetres / scaleMetres));
}

/** Result-card square for a Spot guess. */
export function spotSquare(distanceMetres: number): Square {
  if (distanceMetres <= 100) return "green";
  if (distanceMetres <= 500) return "yellow";
  if (distanceMetres <= 2000) return "orange";
  return "grey";
}

/** Distance in metres between a guess and the real place. */
export function guessDistance(guess: { lat: number; lng: number }, target: { lat: number; lng: number }): number {
  return Math.round(haversineMetres(guess.lat, guess.lng, target.lat, target.lng));
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_START_HOUR_IST = 6;

/**
 * The Kavala Daily key (YYYY-MM-DD) for a moment in time. A new daily starts
 * at 6:00 AM India time, so 5:59 AM still belongs to the previous day.
 */
export function dailyKey(nowMs: number = Date.now()): string {
  const shifted = new Date(nowMs + IST_OFFSET_MS - DAY_START_HOUR_IST * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Accepts a check-in at a place only when the phone's current cell is the
 * place's cell or touches it, compared at the phone's resolution.
 */
export function verifyCheckin(phoneCell: string, place: { lat: number; lng: number }): boolean {
  const res = getResolution(phoneCell);
  const placeCell = latLngToCell(place.lat, place.lng, res);
  return cellsNear(phoneCell, placeCell);
}
