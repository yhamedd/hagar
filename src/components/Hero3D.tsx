"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const LASH_COUNT = 26;
const TUBE_SEGMENTS = 40;
const RADIAL_SEGMENTS = 8;

/** A single lash: a curled tube that tapers to a fine point. */
function createLashGeometry(u: number, seed: number): THREE.BufferGeometry {
  const base = new THREE.Vector3(1.75 * u, 0.42 * (1 - u * u) - 0.55, 0);
  const fan = u * 0.95; // radians away from vertical, sweeping outward
  const length = 1.25 + 0.45 * Math.abs(u) + 0.22 * seed;
  const dir = new THREE.Vector3(Math.sin(fan), Math.cos(fan), 0);
  const curve = new THREE.CatmullRomCurve3([
    base,
    base.clone().addScaledVector(dir, length * 0.38).add(new THREE.Vector3(0, -0.04, 0.34)),
    base.clone().addScaledVector(dir, length * 0.78).add(new THREE.Vector3(0, 0.05, 0.62)),
    base.clone().addScaledVector(dir, length).add(new THREE.Vector3(0.1 * u, 0.3, 0.52)),
  ]);
  const geometry = new THREE.TubeGeometry(curve, TUBE_SEGMENTS, 0.03, RADIAL_SEGMENTS, false);

  // TubeGeometry lays vertices out ring by ring along the curve; pull each
  // ring toward its centre point so the lash narrows to a tip.
  const position = geometry.attributes.position;
  const ring = RADIAL_SEGMENTS + 1;
  const centre = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  for (let i = 0; i <= TUBE_SEGMENTS; i++) {
    const t = i / TUBE_SEGMENTS;
    curve.getPointAt(t, centre);
    const scale = 1 - 0.93 * t * t;
    for (let j = 0; j < ring; j++) {
      const index = i * ring + j;
      vertex.fromBufferAttribute(position, index).sub(centre).multiplyScalar(scale).add(centre);
      position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
  }
  position.needsUpdate = true;
  return geometry;
}

const PEARLS: { position: [number, number, number]; radius: number; tone: "pearl" | "rose" | "ink" }[] = [
  { position: [-2.35, 1.25, -0.6], radius: 0.3, tone: "pearl" },
  { position: [2.3, 1.55, -1.0], radius: 0.22, tone: "rose" },
  { position: [2.55, -0.75, 0.3], radius: 0.36, tone: "pearl" },
  { position: [-2.6, -0.95, 0.2], radius: 0.2, tone: "ink" },
  { position: [-1.1, -1.55, 0.9], radius: 0.14, tone: "rose" },
  { position: [1.2, -1.6, 0.6], radius: 0.17, tone: "ink" },
  { position: [0.1, 2.25, -1.2], radius: 0.16, tone: "pearl" },
  { position: [-1.7, 2.1, -0.9], radius: 0.1, tone: "rose" },
  { position: [1.55, 2.3, 0.2], radius: 0.09, tone: "pearl" },
];

/**
 * Decorative WebGL scene for the landing hero: a fan of 3D lashes that draws
 * itself in, surrounded by floating pearls, reacting to the pointer. Purely
 * presentational -- hidden from assistive tech, paused when off screen, and
 * rendered as a single still frame for visitors who prefer reduced motion.
 */
export default function Hero3D({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // No WebGL: the hero simply shows without the scene.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
    camera.position.set(0, 0.25, 9);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 5, 6);
    const rimLight = new THREE.DirectionalLight(0xf4c9bd, 1.4);
    rimLight.position.set(-5, -2, 3);
    scene.add(keyLight, rimLight);

    const rig = new THREE.Group();
    scene.add(rig);

    // ── Lash fan ──
    const lashMaterial = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, roughness: 0.28, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.2 });
    const lashGroup = new THREE.Group();
    const lashes: { mesh: THREE.Mesh; total: number; delay: number }[] = [];
    for (let i = 0; i < LASH_COUNT; i++) {
      const u = (i / (LASH_COUNT - 1)) * 2 - 1;
      const seed = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const geometry = createLashGeometry(u, Math.abs(seed));
      const mesh = new THREE.Mesh(geometry, lashMaterial);
      lashGroup.add(mesh);
      // Draw from the centre outward.
      lashes.push({ mesh, total: geometry.index?.count ?? 0, delay: 0.25 + Math.abs(u) * 0.7 });
    }
    const lidCurve = new THREE.CatmullRomCurve3(
      Array.from({ length: 9 }, (_, i) => {
        const u = (i / 8) * 2 - 1;
        return new THREE.Vector3(1.82 * u, 0.42 * (1 - u * u) - 0.55, 0);
      })
    );
    const lid = new THREE.Mesh(new THREE.TubeGeometry(lidCurve, 64, 0.045, 10, false), lashMaterial);
    lashGroup.add(lid);
    rig.add(lashGroup);

    // ── Pearls ──
    const pearlMaterials = {
      pearl: new THREE.MeshPhysicalMaterial({ color: 0xf7f2ee, roughness: 0.16, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 1, sheenColor: new THREE.Color(0xffd9e1), iridescence: 0.7, iridescenceIOR: 1.4 }),
      rose: new THREE.MeshPhysicalMaterial({ color: 0xd9a08f, roughness: 0.22, metalness: 0.95 }),
      ink: new THREE.MeshPhysicalMaterial({ color: 0x0c0c0d, roughness: 0.08, metalness: 0.2, clearcoat: 1 }),
    };
    const sphere = new THREE.SphereGeometry(1, 48, 32);
    const pearls = PEARLS.map((spec, index) => {
      const mesh = new THREE.Mesh(sphere, pearlMaterials[spec.tone]);
      mesh.position.set(...spec.position);
      mesh.scale.setScalar(0.0001);
      rig.add(mesh);
      return { mesh, spec, phase: index * 1.7 };
    });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = host;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = width / height;
      // Keep the whole composition in frame on narrow (portrait) canvases.
      // The scene is ~7.4 units wide; pull the camera back until that fits.
      camera.position.z = Math.max(9, 3.7 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
      camera.updateProjectionMatrix();
    };

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeOutBack = (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
    const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

    const renderFrame = (time: number) => {
      // Intro: lashes draw themselves from root to tip, pearls pop in.
      for (const lash of lashes) {
        const progress = easeOutCubic(clamp01((time - lash.delay) / 1.1));
        // Whole triangles only, so a partially drawn lash never tears.
        lash.mesh.geometry.setDrawRange(0, Math.floor((lash.total * progress) / 3) * 3);
      }
      pearls.forEach(({ mesh, spec, phase }, index) => {
        const appear = easeOutBack(clamp01((time - 0.5 - index * 0.09) / 0.8));
        mesh.scale.setScalar(Math.max(0.0001, spec.radius * appear));
        mesh.position.y = spec.position[1] + Math.sin(time * 0.6 + phase) * 0.16;
        mesh.position.x = spec.position[0] + Math.cos(time * 0.4 + phase) * 0.07;
      });

      lashGroup.rotation.y = Math.sin(time * 0.45) * 0.3;
      lashGroup.rotation.x = -0.12 + Math.sin(time * 0.6) * 0.05;
      lashGroup.position.y = Math.sin(time * 0.8) * 0.06;

      rig.rotation.y += (pointer.x * 0.35 - rig.rotation.y) * 0.05;
      rig.rotation.x += (pointer.y * 0.2 - rig.rotation.x) * 0.05;
      renderer.render(scene, camera);
    };

    let frame = 0;
    let visible = true;
    let elapsed = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed += Math.min(0.05, (now - last) / 1000);
      last = now;
      renderFrame(elapsed);
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame || reducedMotion || !visible || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (!frame) renderFrame(reducedMotion ? 10 : elapsed);
    });
    resizeObserver.observe(host);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    visibilityObserver.observe(host);
    const onVisibilityChange = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    resize();
    // Reduced motion: one finished frame, no intro and no loop.
    if (reducedMotion) renderFrame(10);
    else start();

    return () => {
      stop();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pointermove", onPointerMove);
      lashGroup.children.forEach((child) => (child as THREE.Mesh).geometry.dispose());
      sphere.dispose();
      lashMaterial.dispose();
      Object.values(pearlMaterials).forEach((material) => material.dispose());
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} aria-hidden="true" className={`pointer-events-none ${className}`} />;
}
