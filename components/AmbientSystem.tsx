import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points } from '@react-three/drei';
import * as THREE from 'three';
import { AdditiveBlending } from 'three';
import { TreeState } from '../types';

interface AmbientSystemProps {
  treeState: TreeState;
}

// Custom Snowflake Shader Material
const SnowflakeMaterial = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color('#FFFFFF') }
  },
  vertexShader: `
    uniform float time;
    attribute float size;
    attribute float speed;
    attribute vec3 velocity;
    varying float vOpacity;
    void main() {
      vec3 pos = position;
      // Falling animation loop
      float fall = mod(time * speed, 20.0);
      pos.y = pos.y - fall;
      if(pos.y < -10.0) pos.y += 20.0;
      
      // Swaying
      pos.x += sin(time * 0.5 + pos.y) * 0.5;
      pos.z += cos(time * 0.3 + pos.y) * 0.5;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
      
      // Fade near top/bottom boundaries
      vOpacity = smoothstep(-10.0, -8.0, pos.y) * (1.0 - smoothstep(8.0, 10.0, pos.y));
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    varying float vOpacity;
    void main() {
      // Circular soft particle
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;
      float glow = 1.0 - (dist * 2.0);
      glow = pow(glow, 1.5);
      gl_FragColor = vec4(color, vOpacity * glow * 0.8);
    }
  `
};

export const AmbientSystem: React.FC<AmbientSystemProps> = ({ treeState }) => {
  const dustRef = useRef<THREE.Points>(null);
  const spiralRef = useRef<THREE.Points>(null);
  const snowRef = useRef<THREE.Points>(null);
  const snowMaterialRef = useRef<THREE.ShaderMaterial>(null);
  
  const DUST_COUNT = 2000;
  const SNOW_COUNT = 500;

  // 1. Gold Dust with Physics Spring Targets
  const dustData = useMemo(() => {
    const pos = new Float32Array(DUST_COUNT * 3);
    const speeds = new Float32Array(DUST_COUNT);
    const phases = new Float32Array(DUST_COUNT);
    
    for (let i = 0; i < DUST_COUNT; i++) {
        // Initial random sphere
        const r = 15 * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
        
        speeds[i] = Math.random() * 0.2 + 0.1;
        phases[i] = Math.random() * Math.PI * 2;
    }
    return { pos, speeds, phases };
  }, []);

  // 2. Snowflakes Data
  const snowGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(SNOW_COUNT * 3);
    const sizes = new Float32Array(SNOW_COUNT);
    const speeds = new Float32Array(SNOW_COUNT);
    
    for (let i = 0; i < SNOW_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      sizes[i] = Math.random() * 0.5 + 0.2;
      speeds[i] = Math.random() * 1.0 + 0.5;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
    return geo;
  }, []);

  // 3. Golden Spirals
  const spiralPoints = useMemo(() => {
    const points = [];
    const count = 300;
    for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * Math.PI * 12; // More twists
        const radius = 5 * (1 - t) + 1.0;
        const y = t * 10 - 5;
        points.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    }
    return new Float32Array(points);
  }, []);

  // Animation Loop
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    // Animate Snow Shader
    if (snowMaterialRef.current) {
        snowMaterialRef.current.uniforms.time.value = time;
    }

    // Animate Gold Dust (Spring System)
    if (dustRef.current) {
        const positions = dustRef.current.geometry.attributes.position.array as Float32Array;
        const isFormed = treeState === TreeState.FORMED;
        
        for(let i=0; i<DUST_COUNT; i++) {
            const ix = i*3;
            const iy = i*3+1;
            const iz = i*3+2;
            
            const px = positions[ix];
            const py = positions[iy];
            const pz = positions[iz];
            
            const r2 = px*px + py*py + pz*pz;
            const r = Math.sqrt(r2);
            
            const speed = dustData.speeds[i];
            const angleSpeed = 0.2 * speed;
            
            const cos = Math.cos(angleSpeed * delta);
            const sin = Math.sin(angleSpeed * delta);
            
            let nx = px * cos - pz * sin;
            let nz = px * sin + pz * cos;
            let ny = py + Math.sin(time + dustData.phases[i]) * 0.01;
            
            const targetR = isFormed ? 6.0 : 14.0; 
            const force = (targetR - r) * 0.5 * delta;
            
            if (r > 0.1) {
                nx += (nx / r) * force;
                ny += (ny / r) * force * 0.1;
                nz += (nz / r) * force;
            }

            positions[ix] = nx;
            positions[iy] = ny;
            positions[iz] = nz;
        }
        dustRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Rotate Spirals
    if (spiralRef.current) {
        spiralRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group>
      {/* Snowflakes */}
      <points ref={snowRef} geometry={snowGeometry}>
          <shaderMaterial 
            ref={snowMaterialRef}
            args={[SnowflakeMaterial]} 
            transparent 
            depthWrite={false} 
            blending={AdditiveBlending}
          />
      </points>

      {/* Gold Dust */}
      <points ref={dustRef}>
        <bufferGeometry>
            <bufferAttribute 
                attach="attributes-position" 
                count={DUST_COUNT} 
                array={dustData.pos} 
                itemSize={3} 
            />
        </bufferGeometry>
        <pointsMaterial
          transparent
          color="#FFD700"
          size={0.06}
          sizeAttenuation={true}
          depthWrite={false}
          blending={AdditiveBlending}
          opacity={0.6}
        />
      </points>

      {/* Golden Spiral 1 */}
      <Points ref={spiralRef} positions={spiralPoints} stride={3} frustumCulled={false}>
         <pointsMaterial
            transparent
            color="#F3E5AB"
            size={0.12}
            sizeAttenuation={true}
            depthWrite={false}
            blending={AdditiveBlending}
            opacity={0.8}
         />
      </Points>
      
      {/* Golden Spiral 2 (Offset) */}
      <Points rotation={[0, Math.PI, 0]} positions={spiralPoints} stride={3} frustumCulled={false}>
         <pointsMaterial
            transparent
            color="#CD7F32"
            size={0.1}
            sizeAttenuation={true}
            depthWrite={false}
            blending={AdditiveBlending}
            opacity={0.7}
         />
      </Points>
    </group>
  );
};