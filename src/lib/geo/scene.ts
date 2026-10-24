import { cellToBoundary, cellToChildren, cellToLatLng, getResolution, gridDisk } from "h3-js";

/**
 * Pure helpers that turn H3 cells into flat local coordinates for the 3D
 * neighbourhood scene. Units are metres east (x) and north (y) of an origin.
 */

export interface LocalPoint {
  x: number;
  y: number;
}

const METRES_PER_DEGREE = 111_320;

export function toLocal(lat: number, lng: number, origin: { lat: number; lng: number }): LocalPoint {
  return {
    x: (lng - origin.lng) * METRES_PER_DEGREE * Math.cos((origin.lat * Math.PI) / 180),
    y: (lat - origin.lat) * METRES_PER_DEGREE,
  };
}

/** Small stable hash, used to give each block a repeatable height. */
export function cellHash(cell: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < cell.length; i++) {
    h ^= cell.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export interface SceneBlock {
  cell: string;
  outline: LocalPoint[];
  centre: LocalPoint;
  /** 0 to 1, used for block height and colour. */
  activity: number;
  isHome: boolean;
}

export interface NeighbourhoodScene {
  /** Metres from the centre to the farthest block corner, for camera framing. */
  radius: number;
  blocks: SceneBlock[];
  /** Outlines of the touching neighbourhoods, drawn flat and faint. */
  ring: LocalPoint[][];
  home: LocalPoint | null;
  /** Blocks the user is "connected" to, for the web threads. */
  threads: LocalPoint[];
}

/**
 * Builds the scene for a neighbourhood: its cell split into children two
 * levels finer (49 blocks), the touching cells as a faint ring, and threads
 * from the user's home block to a few others.
 */
export function buildScene(hoodCell: string, homeCell: string | undefined, threadCount = 5): NeighbourhoodScene {
  const [lat, lng] = cellToLatLng(hoodCell);
  const origin = { lat, lng };
  const res = getResolution(hoodCell);
  const childRes = Math.min(res + 2, 12);
  const children = cellToChildren(hoodCell, childRes);
  const homeChild = homeCell ? findChildContaining(homeCell, children, childRes) : null;

  let radius = 0;
  const blocks: SceneBlock[] = children.map((cell) => {
    const outline = cellToBoundary(cell).map(([la, ln]) => toLocal(la, ln, origin));
    const [cla, cln] = cellToLatLng(cell);
    for (const p of outline) radius = Math.max(radius, Math.hypot(p.x, p.y));
    return {
      cell,
      outline,
      centre: toLocal(cla, cln, origin),
      activity: (cellHash(cell) % 1000) / 1000,
      isHome: cell === homeChild,
    };
  });

  const ring = gridDisk(hoodCell, 1)
    .filter((c) => c !== hoodCell)
    .map((c) => cellToBoundary(c).map(([la, ln]) => toLocal(la, ln, origin)));

  const homeBlock = blocks.find((b) => b.isHome) ?? null;
  const others = blocks
    .filter((b) => !b.isHome)
    .sort((a, b) => cellHash(a.cell + "t") - cellHash(b.cell + "t"))
    .slice(0, threadCount)
    .map((b) => b.centre);

  return { radius, blocks, ring, home: homeBlock ? homeBlock.centre : null, threads: homeBlock ? others : [] };
}

function findChildContaining(homeCell: string, children: string[], childRes: number): string | null {
  const homeRes = getResolution(homeCell);
  if (homeRes >= childRes) {
    // The home cell is at least as fine as the blocks: find the block whose area contains it.
    const [la, ln] = cellToLatLng(homeCell);
    let best: string | null = null;
    let bestDistance = Infinity;
    for (const c of children) {
      const [cla, cln] = cellToLatLng(c);
      const d = (cla - la) ** 2 + (cln - ln) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = c;
      }
    }
    return best;
  }
  // The home cell is coarser than the blocks: use the block nearest its centre.
  return findChildContaining(cellToChildren(homeCell, childRes)[0], children, childRes);
}
