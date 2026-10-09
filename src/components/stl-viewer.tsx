import { useEffect, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type StlStats = { volumeCm3: number; size: [number, number, number] };

/** Parse STL (binary or ASCII) and compute closed-mesh volume in cm³ (model units = mm). */
export function analyzeStl(buffer: ArrayBuffer): { geometry: THREE.BufferGeometry; stats: StlStats } {
  const geometry = new STLLoader().parse(buffer);
  const pos = geometry.getAttribute("position");
  let vol = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    vol += a.dot(b.clone().cross(c)) / 6;
  }
  geometry.computeBoundingBox();
  const s = new THREE.Vector3(); geometry.boundingBox!.getSize(s);
  return { geometry, stats: { volumeCm3: Math.abs(vol) / 1000, size: [s.x, s.y, s.z] } };
}

export function StlViewer({ geometry }: { geometry: THREE.BufferGeometry }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const w = el.clientWidth, h = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h); el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const geo = geometry.clone(); geo.center(); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.1, roughness: 0.6 }));
    mesh.rotation.x = -Math.PI / 2; scene.add(mesh);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 1.2); light.position.set(1, 2, 3); scene.add(light);
    geo.computeBoundingSphere(); const r = geo.boundingSphere?.radius || 50;
    const camera = new THREE.PerspectiveCamera(40, w / h, r / 100, r * 20);
    camera.position.set(r * 1.6, r * 1.3, r * 1.9);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 1.5;
    let raf = 0;
    const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
    loop();
    return () => { cancelAnimationFrame(raf); controls.dispose(); renderer.dispose(); geo.dispose(); el.removeChild(renderer.domElement); };
  }, [geometry]);
  return <div ref={ref} className="h-64 w-full cursor-grab border-2 border-foreground bg-muted blueprint-grid active:cursor-grabbing" />;
}
