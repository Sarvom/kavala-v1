"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildScene, type LocalPoint } from "@/lib/geo/scene";

interface Props {
  hoodCell: string;
  homeCell?: string;
  height?: number;
  /** Number of web threads drawn from your home block. */
  threads?: number;
  label?: string;
}

const COLORS = {
  background: 0x0b1020,
  block: 0x1f6f78,
  blockHigh: 0x3ddc97,
  edge: 0x9fe7ff,
  home: 0xffb833,
  ring: 0x2a3555,
  thread: 0xffd27a,
  web: 0x3a4a78,
};

/**
 * A 3D view of the user's neighbourhood: its H3 cell split into 49 hexagonal
 * blocks, the home block lit in amber, web threads to neighbours, and a faint
 * ring of touching neighbourhoods. Drag to turn it.
 */
export default function Neighbourhood3D({ hoodCell, homeCell, height = 260, threads = 5, label }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setFailed(true);
      return;
    }
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(COLORS.background, 1);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(COLORS.background, 1, 8);

    const data = buildScene(hoodCell, homeCell, threads);
    const scale = 1 / Math.max(data.radius, 1); // fit the neighbourhood into a unit circle
    const toVec = (p: LocalPoint, y = 0) => new THREE.Vector3(p.x * scale, y, -p.y * scale);

    const group = new THREE.Group();
    scene.add(group);
    const disposables: { dispose: () => void }[] = [];

    // Blocks: one extruded hexagon per child cell.
    for (const b of data.blocks) {
      const shape = new THREE.Shape(b.outline.map((p) => new THREE.Vector2(p.x * scale, p.y * scale)));
      const h = b.isHome ? 0.36 : 0.04 + b.activity * 0.22;
      const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      const color = b.isHome ? COLORS.home : new THREE.Color(COLORS.block).lerp(new THREE.Color(COLORS.blockHigh), b.activity);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.55,
        metalness: 0.1,
        emissive: b.isHome ? COLORS.home : 0x000000,
        emissiveIntensity: b.isHome ? 0.45 : 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      // Shrink each block slightly towards its centre so the gaps read as streets.
      const c = toVec(b.centre);
      mesh.position.set(c.x * 0.08, 0, c.z * 0.08);
      mesh.scale.set(0.92, 1, 0.92);
      group.add(mesh);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: COLORS.edge, transparent: true, opacity: b.isHome ? 0.9 : 0.35 }),
      );
      edges.position.copy(mesh.position);
      edges.scale.copy(mesh.scale);
      group.add(edges);
      disposables.push(geo, mat, edges.geometry, edges.material as THREE.Material);
    }

    // Touching neighbourhoods: flat, faint outlines on the ground.
    for (const outline of data.ring) {
      const pts = [...outline, outline[0]].map((p) => toVec(p, 0.001));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: COLORS.ring });
      group.add(new THREE.Line(geo, mat));
      disposables.push(geo, mat);
    }

    // A web on the ground around home: spokes and rings.
    if (data.home) {
      const hc = toVec(data.home, 0.002);
      const webMat = new THREE.LineBasicMaterial({ color: COLORS.web, transparent: true, opacity: 0.8 });
      disposables.push(webMat);
      const spokes = 12;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        const geo = new THREE.BufferGeometry().setFromPoints([hc, new THREE.Vector3(hc.x + Math.cos(a) * 1.2, 0.002, hc.z + Math.sin(a) * 1.2)]);
        group.add(new THREE.Line(geo, webMat));
        disposables.push(geo);
      }
      for (let r = 1; r <= 4; r++) {
        const ring: THREE.Vector3[] = [];
        for (let i = 0; i <= spokes; i++) {
          const a = (i / spokes) * Math.PI * 2;
          ring.push(new THREE.Vector3(hc.x + Math.cos(a) * r * 0.28, 0.002, hc.z + Math.sin(a) * r * 0.28));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(ring);
        group.add(new THREE.Line(geo, webMat));
        disposables.push(geo);
      }

      // Threads: glowing arcs from home to the neighbours you're connected to.
      const threadMat = new THREE.LineBasicMaterial({ color: COLORS.thread });
      disposables.push(threadMat);
      const start = toVec(data.home, 0.4);
      for (const t of data.threads) {
        const end = toVec(t, 0.12);
        const mid = start.clone().lerp(end, 0.5);
        mid.y += 0.35;
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
        group.add(new THREE.Line(geo, threadMat));
        const dotGeo = new THREE.SphereGeometry(0.018, 12, 12);
        const dot = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: COLORS.thread }));
        dot.position.copy(end);
        group.add(dot);
        disposables.push(geo, dotGeo, dot.material as THREE.Material);
      }
    }

    scene.add(new THREE.AmbientLight(0x8899cc, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(2, 4, 3);
    scene.add(sun);
    const glow = new THREE.PointLight(COLORS.home, 1.2, 2.5);
    if (data.home) glow.position.copy(toVec(data.home, 0.7));
    scene.add(glow);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
    camera.position.set(0, 1.9, 2.4);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 1.4;
    controls.maxDistance = 4;
    controls.maxPolarAngle = Math.PI * 0.45;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.6;
    controls.target.set(0, 0, 0);

    const resize = () => {
      const w = el.clientWidth;
      renderer.setSize(w, height, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = `${height}px`;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    let frame = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      const t = clock.getElapsedTime();
      glow.intensity = reduceMotion ? 1.2 : 1 + Math.sin(t * 2) * 0.3;
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [hoodCell, homeCell, height, threads]);

  if (failed) {
    return <p className="muted">Your browser can&apos;t show the 3D view, but everything else works.</p>;
  }
  return (
    <figure className="scene3d">
      <div ref={box} style={{ height }} role="img" aria-label="3D view of your neighbourhood: hexagonal blocks, your home block in amber, and threads to neighbours" />
      {label && <figcaption className="muted">{label}</figcaption>}
    </figure>
  );
}
