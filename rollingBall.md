# Rotating Ball Implementation Guide

## Overview

This guide provides comprehensive instructions for recreating a rotating 3D sphere at the center of a scene using React Three Fiber (a React renderer for Three.js). The sphere features continuous rotation, mouse-reactive movement, organic surface displacement via Simplex noise, and custom GLSL shader rendering.

---

## Table of Contents

1. [Project Setup & Dependencies](#project-setup--dependencies)
2. [Component Architecture](#component-architecture)
3. [The Rotating Sphere Component](#the-rotating-sphere-component)
4. [Scene Configuration](#scene-configuration)
5. [Shader Implementation](#shader-implementation)
6. [Animation Logic](#animation-logic)
7. [Styling & Layout](#styling--layout)
8. [Integration into UI](#integration-into-ui)
9. [Animation Parameters & Customization](#animation-parameters--customization)

---

## Project Setup & Dependencies

### Required Packages

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "three": "^r128",
    "@react-three/fiber": "^8.x",
    "@react-three/drei": "^9.x",
    "tailwindcss": "^3.x"
  }
}
```

### Installation Commands

```bash
pnpm install three @react-three/fiber @react-three/drei
```

### Import Structure

All 3D components require imports from React Three Fiber and Three.js:

```typescript
import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { IcosahedronGeometry, ShaderMaterial, MathUtils, Vector2 } from 'three';
import { Simplex } from 'simplex-noise';
```

---

## Component Architecture

### File Structure

```
components/chat/
├── sentient-sphere.tsx       # Main 3D rotating sphere component
├── neural-monitor.tsx         # Container wrapper for the sphere
└── conversation-stream.tsx    # Integration layer that uses the sphere

app/
├── globals.css                # Animation keyframes and styling
└── neural-core.tsx            # Main page orchestrating the UI
```

### Component Hierarchy

```
NeuralCore (page)
  └── ConversationStream
      └── NeuralMonitor
          └── SentientSphere (Canvas + custom mesh)
              └── 3D Scene (WebGL)
```

---

## The Rotating Sphere Component

### File: `components/chat/sentient-sphere.tsx`

#### Component Structure

```typescript
export function SentientSphere() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.5], fov: 75 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Sphere />
    </Canvas>
  );
}

function Sphere() {
  // 3D sphere implementation goes here
}
```

#### Canvas Configuration

| Property | Value | Purpose |
|----------|-------|---------|
| `camera.position` | `[0, 0, 3.5]` | Positions camera 3.5 units away from the sphere center |
| `camera.fov` | `75` | Field of view (degrees) for optimal sphere visibility |
| `gl.antialias` | `true` | Smooths edges and reduces jagged appearance |
| `gl.alpha` | `true` | Enables transparency for layering with other UI |

#### Sphere Mesh Implementation

```typescript
function Sphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const pointer = useRef(new Vector2(0.5, 0.5));
  
  // State tracking for smooth rotations
  const targetRotation = useRef({ x: 0, z: 0 });
  
  // useFrame hook for animation loop
  // useThree hook for scene and camera access
  // useEffect for event listeners
}
```

### Key Props and Refs

- **meshRef**: Reference to the Three.js Mesh object for updating rotation
- **materialRef**: Reference to ShaderMaterial for updating shader uniforms
- **pointer**: Stores normalized mouse position (0-1 range)
- **targetRotation**: Stores desired rotation values for smooth lerping

---

## Scene Configuration

### Geometry Setup

The sphere uses an **Icosahedron geometry** (20-faced polyhedron) for smooth appearance:

```typescript
const geometry = new IcosahedronGeometry(1.44, 64);
```

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Radius | `1.44` | Sets sphere size relative to camera distance |
| Subdivisions | `64` | Higher = smoother surface (more vertices) |

**Why Icosahedron?**
- More uniform vertex distribution than UV sphere
- Better deformation with displacement shaders
- Natural look for organic animations

### Material Setup

```typescript
const material = new ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uMouse: { value: new Vector2(0.5, 0.5) },
  },
  vertexShader: vertexShaderCode,
  fragmentShader: fragmentShaderCode,
  wireframe: true,
  transparent: true,
  depthWrite: false,
});
```

| Property | Value | Purpose |
|----------|-------|---------|
| `wireframe` | `true` | Renders only edges, creating grid pattern |
| `transparent` | `true` | Enables opacity blending with background |
| `depthWrite` | `false` | Prevents depth buffer issues with transparency |

### Uniforms

Uniforms are variables passed to shaders that remain constant for all vertices/fragments in a single frame:

```typescript
{
  uTime: { value: 0 },        // Animation time (0-∞)
  uMouse: { value: new Vector2(0.5, 0.5) }  // Mouse position (0-1)
}
```

---

## Shader Implementation

### Vertex Shader

The vertex shader modifies each vertex position to create surface displacement using Simplex noise.

```glsl
uniform float uTime;
uniform vec2 uMouse;

varying float vDisplacement;

void main() {
  vec3 pos = position;
  
  // Calculate displacement using noise
  float noise = snoise(normalize(pos) * 3.0 + uTime * 0.5);
  float displacement = noise * 0.3;
  
  // Store for fragment shader
  vDisplacement = displacement;
  
  // Apply displacement to vertex position
  pos += normalize(pos) * displacement;
  
  // Standard vertex transformation
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

**Key Concepts:**

- **Simplex Noise (snoise)**: Generates smooth, pseudo-random values
- **normalize(pos)**: Converts position to direction (magnitude 1)
- **vDisplacement**: Varying passed to fragment shader for color calculation
- **projectionMatrix * modelViewMatrix**: Standard Three.js transformation

### Fragment Shader

The fragment shader determines the color and brightness of each pixel.

```glsl
varying float vDisplacement;
uniform vec2 uMouse;

void main() {
  // Color based on displacement
  vec3 color = vec3(0.2, 0.4, 0.9);  // Blue base
  
  // Intensity modulation
  float intensity = 0.5 + vDisplacement;
  color *= intensity;
  
  // Mouse influence
  color += uMouse * 0.1;
  
  gl_FragColor = vec4(color, 0.6);
}
```

**Key Concepts:**

- **vDisplacement**: Retrieved from vertex shader (interpolated across surface)
- **vec3(r, g, b)**: RGB color (0-1 range)
- **gl_FragColor**: Output pixel color with alpha channel

### Simplex Noise Function

Include the Simplex noise GLSL function at the top of your shader code. This function generates smooth, organic noise:

```glsl
// Simplex noise implementation (3D version)
// Include the full function from a shader library or implement using:
// https://github.com/ashima/webgl-noise/blob/master/src/noise3D.glsl

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }

// ... (full implementation with permutation and gradient functions)

float snoise(vec3 v) { /* ... */ }
```

---

## Animation Logic

### 1. Continuous Rotation

The sphere rotates continuously around the Y-axis:

```typescript
useFrame((state) => {
  if (meshRef.current) {
    const { delta } = state.clock;
    
    // Continuous Y-axis rotation
    meshRef.current.rotation.y += delta * 0.05;  // ~5% of delta per frame
  }
});
```

**Animation Rate:**
- `delta`: Time elapsed since last frame (e.g., 0.016 for 60 FPS)
- `delta * 0.05`: Rotation speed multiplier (adjust for faster/slower rotation)
- One full rotation (2π radians) takes approximately ~125 frames at 60 FPS

### 2. Mouse-Reactive Rotation

X and Z rotations respond to mouse position using **linear interpolation (lerp)**:

```typescript
// Track mouse movement
useEffect(() => {
  const handleMouseMove = (event: MouseEvent) => {
    pointer.current.x = event.clientX / window.innerWidth;
    pointer.current.y = event.clientY / window.innerHeight;
  };
  
  window.addEventListener('mousemove', handleMouseMove);
  return () => window.removeEventListener('mousemove', handleMouseMove);
}, []);

// In useFrame callback:
useFrame(() => {
  if (meshRef.current) {
    const targetX = (pointer.current.y - 0.5) * Math.PI;
    const targetZ = (pointer.current.x - 0.5) * Math.PI;
    
    // Smooth interpolation (lerp)
    meshRef.current.rotation.x = MathUtils.lerp(
      meshRef.current.rotation.x,
      targetX,
      0.1  // Interpolation factor (0.1 = 10% per frame)
    );
    
    meshRef.current.rotation.z = MathUtils.lerp(
      meshRef.current.rotation.z,
      targetZ,
      0.1
    );
  }
});
```

**How Lerp Works:**
```
newValue = currentValue + (targetValue - currentValue) * factor
```

- **factor = 0.1**: Moves 10% toward target per frame (smooth acceleration)
- **factor = 1.0**: Instantly snaps to target (no smoothing)
- **factor = 0.05**: Very slow, smooth easing effect

### 3. Shader Animation Update

Update shader uniforms in the animation loop:

```typescript
useFrame((state) => {
  if (materialRef.current) {
    // Update time uniform for Simplex noise animation
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    
    // Update mouse uniform for shader effects
    materialRef.current.uniforms.uMouse.value.set(
      pointer.current.x,
      pointer.current.y
    );
  }
});
```

**Uniform Updates:**
- **uTime**: Continuous value used for noise animation (creates rippling effect)
- **uMouse**: Current mouse position, influences surface color/intensity

---

## Styling & Layout

### Container: `components/chat/neural-monitor.tsx`

The sphere must be wrapped in a fixed-size container:

```typescript
export function NeuralMonitor({ isThinking }: { isThinking: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      {/* Sphere container */}
      <div className="w-48 h-48 rounded-full shadow-lg overflow-hidden">
        <SentientSphere />
      </div>
      
      {/* Status text */}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {isThinking ? 'Processing' : 'Neural Core Active'}
        </p>
      </div>
    </div>
  );
}
```

| Class | Purpose |
|-------|---------|
| `w-48 h-48` | Fixed 192x192px container (12rem) |
| `rounded-full` | Circular border to frame sphere |
| `overflow-hidden` | Clips sphere to circular boundary |
| `shadow-lg` | Adds depth with shadow |

### Global CSS Animations: `app/globals.css`

Define surrounding animations and glow effects:

```css
@keyframes orb-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.5),
                0 0 40px rgba(139, 92, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.7),
                0 0 60px rgba(139, 92, 246, 0.5);
  }
}

@keyframes orb-think {
  0%, 100% {
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.6),
                0 0 60px rgba(59, 130, 246, 0.4);
  }
  50% {
    box-shadow: 0 0 50px rgba(139, 92, 246, 1),
                0 0 80px rgba(59, 130, 246, 0.7);
  }
}

.neural-monitor {
  animation: orb-glow 3s ease-in-out infinite;
}

.neural-monitor.thinking {
  animation: orb-think 1.5s ease-in-out infinite;
}
```

### Design Tokens (Tailwind)

Define color variables in `globals.css`:

```css
:root {
  --primary: #3B82F6;        /* Blue */
  --secondary: #8B5CF6;      /* Violet */
  --background: #0F172A;     /* Dark blue-gray */
  --foreground: #E2E8F0;     /* Light gray */
}

.dark {
  color-scheme: dark;
  background-color: var(--background);
  color: var(--foreground);
}
```

---

## Integration into UI

### Step 1: Create the Sphere Component

File: `components/chat/sentient-sphere.tsx`

```typescript
'use client';

import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function SentientSphere() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.5], fov: 75 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Sphere />
    </Canvas>
  );
}

function Sphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const pointer = useRef(new THREE.Vector2(0.5, 0.5));

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      pointer.current.x = event.clientX / window.innerWidth;
      pointer.current.y = event.clientY / window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Animation loop
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const { delta, clock } = state;

    // Continuous Y rotation
    meshRef.current.rotation.y += delta * 0.05;

    // Smooth X and Z rotation based on mouse
    const targetX = (pointer.current.y - 0.5) * Math.PI;
    const targetZ = (pointer.current.x - 0.5) * Math.PI;

    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      targetX,
      0.1
    );
    meshRef.current.rotation.z = THREE.MathUtils.lerp(
      meshRef.current.rotation.z,
      targetZ,
      0.1
    );

    // Update shader uniforms
    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    materialRef.current.uniforms.uMouse.value.set(
      pointer.current.x,
      pointer.current.y
    );
  });

  // Create geometry and material
  const geometry = new THREE.IcosahedronGeometry(1.44, 64);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    },
    vertexShader: `
      uniform float uTime;
      varying float vDisplacement;

      void main() {
        vec3 pos = position;
        float noise = sin(length(pos) * 3.0 + uTime) * 0.3;
        vDisplacement = noise;
        pos += normalize(pos) * noise;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying float vDisplacement;

      void main() {
        vec3 color = vec3(0.2, 0.4, 0.9);
        float intensity = 0.5 + vDisplacement;
        color *= intensity;
        gl_FragColor = vec4(color, 0.6);
      }
    `,
    wireframe: true,
    transparent: true,
    depthWrite: false,
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}
```

### Step 2: Create the Monitor Wrapper

File: `components/chat/neural-monitor.tsx`

```typescript
import { SentientSphere } from './sentient-sphere';

interface NeuralMonitorProps {
  isThinking: boolean;
}

export function NeuralMonitor({ isThinking }: NeuralMonitorProps) {
  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <div 
        className={`w-48 h-48 rounded-full shadow-lg overflow-hidden transition-all
          ${isThinking ? 'animate-orb-think' : 'animate-orb-glow'}`}
      >
        <SentientSphere />
      </div>
      
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {isThinking ? 'Processing' : 'Neural Core Active'}
        </p>
      </div>
    </div>
  );
}
```

### Step 3: Integrate into Main Page

File: `components/chat/neural-core.tsx` or `app/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { NeuralMonitor } from '@/components/chat/neural-monitor';

export function NeuralCore() {
  const [isThinking, setIsThinking] = useState(false);

  const handleSendMessage = async (message: string) => {
    setIsThinking(true);
    // ... process message ...
    setIsThinking(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <NeuralMonitor isThinking={isThinking} />
      
      {/* Rest of your chat interface */}
    </div>
  );
}
```

---

## Animation Parameters & Customization

### Rotation Speed

Adjust the continuous rotation speed in the animation loop:

```typescript
// Slow rotation (0.02)
meshRef.current.rotation.y += delta * 0.02;

// Normal rotation (0.05)
meshRef.current.rotation.y += delta * 0.05;

// Fast rotation (0.1)
meshRef.current.rotation.y += delta * 0.1;
```

### Mouse Responsiveness

Adjust the lerp factor to change mouse interaction smoothness:

```typescript
// Very smooth (takes longer to track mouse)
meshRef.current.rotation.x = MathUtils.lerp(..., 0.05);

// Normal response
meshRef.current.rotation.x = MathUtils.lerp(..., 0.1);

// Snappy response (less smoothing)
meshRef.current.rotation.x = MathUtils.lerp(..., 0.2);
```

### Sphere Size

Change the icosahedron radius:

```typescript
// Smaller sphere
const geometry = new IcosahedronGeometry(1.0, 64);

// Normal size
const geometry = new IcosahedronGeometry(1.44, 64);

// Larger sphere
const geometry = new IcosahedronGeometry(2.0, 64);
```

### Wireframe Density

Increase subdivisions for denser wireframe:

```typescript
// Sparse wireframe
const geometry = new IcosahedronGeometry(1.44, 32);

// Standard wireframe
const geometry = new IcosahedronGeometry(1.44, 64);

// Dense wireframe
const geometry = new IcosahedronGeometry(1.44, 128);
```

### Color Customization

Modify the fragment shader color:

```glsl
// Blue
vec3 color = vec3(0.2, 0.4, 0.9);

// Purple
vec3 color = vec3(0.6, 0.2, 0.9);

// Cyan
vec3 color = vec3(0.2, 0.8, 0.9);

// Green
vec3 color = vec3(0.2, 0.9, 0.4);
```

### Animation Speed (Shader)

Adjust the noise frequency in the vertex shader:

```glsl
// Slower animation
float noise = snoise(normalize(pos) * 2.0 + uTime * 0.3);

// Normal animation
float noise = snoise(normalize(pos) * 3.0 + uTime * 0.5);

// Faster animation
float noise = snoise(normalize(pos) * 4.0 + uTime * 0.8);
```

---

## Troubleshooting

### Issue: Sphere Not Appearing

**Solution:** Check camera position. Ensure `camera.position[2]` is greater than sphere radius.

```typescript
// If sphere radius is 1.44, camera should be at least 3.5 units away
camera={{ position: [0, 0, 4.0] }}
```

### Issue: Performance Lag

**Solutions:**
- Reduce subdivision count: `IcosahedronGeometry(1.44, 32)` instead of 64
- Disable wireframe: `wireframe: false`
- Use simpler noise function in shader
- Reduce animation complexity

### Issue: Shader Compilation Errors

**Solution:** Ensure Simplex noise function is properly defined. Use a standard shader library implementation or reference the WebGL Noise GitHub repository.

### Issue: Mouse Movement Not Responsive

**Solution:** Verify event listener is attached:

```typescript
useEffect(() => {
  const handler = (e: MouseEvent) => {
    pointer.current.set(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
  };
  window.addEventListener('mousemove', handler);
  return () => window.removeEventListener('mousemove', handler);
}, []);
```

---

## Summary

The rotating sphere implementation combines:

1. **React Three Fiber Canvas** - WebGL rendering context
2. **Icosahedron Geometry** - 3D base shape with good subdivision properties
3. **Custom Shaders** - Vertex displacement and fragment color calculation
4. **Animation Loop** - Continuous rotation + mouse-reactive movement via lerp
5. **Uniform Updates** - Real-time shader parameter updates
6. **Container Styling** - Tailwind CSS for layout and surrounding effects

By following this guide, you can recreate a sophisticated, interactive 3D sphere suitable for modern AI interfaces or data visualization applications.

---

## References

- [React Three Fiber Documentation](https://docs.pmnd.rs/react-three-fiber/)
- [Three.js Documentation](https://threejs.org/docs/)
- [WebGL Noise (Simplex)](https://github.com/ashima/webgl-noise)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
