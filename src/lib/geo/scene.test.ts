import { describe, expect, it } from "vitest";
import { cellToParent, latLngToCell } from "h3-js";
import { buildScene, toLocal } from "./scene";

describe("toLocal", () => {
  it("measures about 111 m for 0.001 degrees of latitude", () => {
    const p = toLocal(10.001, 76.3, { lat: 10, lng: 76.3 });
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeGreaterThan(110);
    expect(p.y).toBeLessThan(112);
  });
});

describe("buildScene", () => {
  const home = latLngToCell(9.9816, 76.2999, 9);
  const hood = cellToParent(home, 7);
  const scene = buildScene(hood, home, 5);

  it("splits the neighbourhood into 49 blocks with exactly one home block", () => {
    expect(scene.blocks).toHaveLength(49);
    expect(scene.blocks.filter((b) => b.isHome)).toHaveLength(1);
  });

  it("draws the six touching neighbourhoods and five threads", () => {
    expect(scene.ring).toHaveLength(6);
    expect(scene.threads).toHaveLength(5);
    expect(scene.radius).toBeGreaterThan(0);
  });

  it("has no threads when there is no home", () => {
    expect(buildScene(hood, undefined).threads).toHaveLength(0);
  });
});
