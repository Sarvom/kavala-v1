import { describe, expect, it } from "vitest";
import { latLngToCell } from "h3-js";
import { dailyKey, guessDistance, spotPoints, spotSquare, verifyCheckin } from "./score";

describe("spot scoring", () => {
  it("gives 1000 for a perfect guess and falls off with distance", () => {
    expect(spotPoints(0)).toBe(1000);
    expect(spotPoints(500)).toBe(368);
    expect(spotPoints(2000)).toBe(18);
    expect(spotPoints(-5)).toBe(0);
  });

  it("maps distances to result squares", () => {
    expect(spotSquare(80)).toBe("green");
    expect(spotSquare(300)).toBe("yellow");
    expect(spotSquare(1500)).toBe("orange");
    expect(spotSquare(5000)).toBe("grey");
  });

  it("measures guess distance in metres", () => {
    const d = guessDistance({ lat: 9.98, lng: 76.3 }, { lat: 9.981, lng: 76.3 });
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });
});

describe("dailyKey", () => {
  it("starts a new daily at 6:00 AM India time", () => {
    // 2026-10-25 05:59 IST is 2026-10-25 00:29 UTC.
    expect(dailyKey(Date.UTC(2026, 9, 25, 0, 29))).toBe("2026-10-24");
    // 2026-10-25 06:00 IST is 2026-10-25 00:30 UTC.
    expect(dailyKey(Date.UTC(2026, 9, 25, 0, 30))).toBe("2026-10-25");
  });
});

describe("verifyCheckin", () => {
  const place = { lat: 9.9816, lng: 76.2999 };

  it("accepts a phone at the place", () => {
    expect(verifyCheckin(latLngToCell(place.lat, place.lng, 11), place)).toBe(true);
  });

  it("refuses a phone a kilometre away", () => {
    expect(verifyCheckin(latLngToCell(place.lat + 0.01, place.lng, 11), place)).toBe(false);
  });
});
