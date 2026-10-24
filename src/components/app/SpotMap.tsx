"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

interface Props {
  center: [number, number];
  guess: [number, number] | null;
  target: { lat: number; lng: number; name: string } | null;
  onPick?: (lat: number, lng: number) => void;
}

/**
 * The Spot map. Zoom is capped at 16 so OpenStreetMap doesn't print shop and
 * cafe names, which would give the answer away.
 */
export default function SpotMap({ center, guess, target, onPick }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { center, zoom: 15, minZoom: 13, maxZoom: 16, scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 16,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => pick.current?.(e.latlng.lat, e.latlng.lng));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // Created once; markers are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    if (guess) L.circleMarker(guess, { radius: 9, className: "spot-guess", weight: 3 }).addTo(g);
    if (target) {
      L.circleMarker([target.lat, target.lng], { radius: 9, className: "spot-target", weight: 3 })
        .bindTooltip(target.name, { permanent: true, direction: "top", offset: [0, -8] })
        .addTo(g);
      if (guess) {
        L.polyline([guess, [target.lat, target.lng]], { className: "spot-line", weight: 2, dashArray: "6 6" }).addTo(g);
        m.fitBounds(L.latLngBounds([guess, [target.lat, target.lng]]), { padding: [40, 40], maxZoom: 16 });
      }
    }
  }, [guess, target]);

  return <div ref={box} className="map spot-map" role="application" aria-label="Map: tap to place your guess" />;
}
