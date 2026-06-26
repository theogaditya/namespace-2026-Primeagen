"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Simplex noise GLSL (inlined to avoid extra deps) ──────────────────
const SIMPLEX_NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

const VERTEX_SHADER = /* glsl */ `
${SIMPLEX_NOISE_GLSL}

uniform float uTime;
uniform float uIntensity;
varying float vDisplacement;

void main() {
  vec3 pos = position;
  float noise = snoise(normalize(pos) * 3.0 + uTime * 0.4);
  float displacement = noise * 0.25 * uIntensity;
  vDisplacement = displacement;
  pos += normalize(pos) * displacement;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
varying float vDisplacement;
uniform vec2 uMouse;
uniform float uIntensity;

void main() {
  // Blue-purple gradient based on displacement
  vec3 baseColor = vec3(0.18, 0.32, 0.88);
  vec3 accentColor = vec3(0.55, 0.28, 0.92);
  float mix_ = 0.5 + vDisplacement * 1.5;
  vec3 color = mix(baseColor, accentColor, clamp(mix_, 0.0, 1.0));

  // Intensity modulation
  float intensity = 0.5 + vDisplacement + uMouse.x * 0.08;
  color *= intensity * uIntensity;

  gl_FragColor = vec4(color, 0.55);
}
`;

// ── Inner Sphere mesh (runs inside Canvas) ────────────────────────────
function Sphere({ isThinking }: { isThinking: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const pointer = useRef(new THREE.Vector2(0.5, 0.5));

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.44, 64), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uIntensity: { value: 1.0 },
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        wireframe: true,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  // Track mouse
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pointer.current.x = e.clientX / window.innerWidth;
      pointer.current.y = e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;
    const { clock } = state;
    const delta = clock.getDelta();

    // Continuous Y rotation — faster when thinking
    meshRef.current.rotation.y += delta * (isThinking ? 0.15 : 0.05);

    // Mouse-reactive X/Z rotation
    const targetX = (pointer.current.y - 0.5) * Math.PI;
    const targetZ = (pointer.current.x - 0.5) * Math.PI;
    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      targetX,
      0.1,
    );
    meshRef.current.rotation.z = THREE.MathUtils.lerp(
      meshRef.current.rotation.z,
      targetZ,
      0.1,
    );

    // Shader uniform updates
    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    materialRef.current.uniforms.uMouse.value.set(
      pointer.current.x,
      pointer.current.y,
    );
    // Smoothly transition intensity
    const targetIntensity = isThinking ? 1.5 : 1.0;
    materialRef.current.uniforms.uIntensity.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uIntensity.value,
      targetIntensity,
      0.05,
    );
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

// ── Exported public component ─────────────────────────────────────────
interface SentientSphereProps {
  isThinking?: boolean;
}

export default function SentientSphere({
  isThinking = false,
}: SentientSphereProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.5], fov: 75 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Sphere isThinking={isThinking} />
    </Canvas>
  );
}
