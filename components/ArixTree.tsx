import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Vector3, Color, MathUtils } from 'three';
import { TreeState, ParticleData } from '../types';

interface ArixTreeProps {
  treeState: TreeState;
}

const COUNT = 1500; // Total pine needles/branches
const ORNAMENT_COUNT = 150; // Total ornaments
const DUST_COUNT = 400; // Floating dust

// Helper to generate random point in sphere
const randomInSphere = (radius: number): Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  return new Vector3(x, y, z);
};

// Helper to generate point on a cone (Tree shape)
const randomInCone = (height: number, maxRadius: number, yOffset: number): Vector3 => {
  const y = Math.random() * height; // Height from bottom
  const r = (1 - y / height) * maxRadius; // Radius at height y
  const theta = Math.random() * Math.PI * 2;
  
  // Spiral distribution for better look
  const spiral = y * 5; 
  
  const x = r * Math.cos(theta + spiral);
  const z = r * Math.sin(theta + spiral);
  
  return new Vector3(x, y - yOffset, z);
};

export const ArixTree: React.FC<ArixTreeProps> = ({ treeState }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const ornamentRef = useRef<InstancedMesh>(null);
  const dustRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  // --- 1. Needles/Branches Data Generation ---
  const particles = useMemo(() => {
    const data: ParticleData[] = [];
    const greenPalette = ['#022D19', '#034024', '#004b2c', '#0f3d2e'];
    
    for (let i = 0; i < COUNT; i++) {
      const scale = Math.random() * 0.15 + 0.05;
      const color = new Color(greenPalette[Math.floor(Math.random() * greenPalette.length)]);
      
      // Tree position (Cone)
      const treePos = randomInCone(7, 2.5, 3.5);
      
      // Scatter position (Sphere)
      const scatterPos = randomInSphere(8);

      data.push({
        id: i,
        treePosition: treePos,
        scatterPosition: scatterPos,
        scale,
        color,
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        speed: Math.random() * 0.5 + 0.2,
        phase: Math.random() * Math.PI * 2,
        type: 'NEEDLE'
      });
    }
    return data;
  }, []);

  // --- 2. Ornaments Data Generation ---
  const ornaments = useMemo(() => {
    const data: ParticleData[] = [];
    const goldPalette = ['#FFD700', '#DAA520', '#B8860B', '#F3E5AB'];

    for (let i = 0; i < ORNAMENT_COUNT; i++) {
      const scale = Math.random() * 0.15 + 0.1;
      const color = new Color(goldPalette[Math.floor(Math.random() * goldPalette.length)]);
      
      // Ornaments sit slightly outside the cone radius usually
      const y = Math.random() * 6.5; 
      const maxR = (1 - y / 7) * 2.5;
      const r = Math.random() * (maxR * 0.2) + maxR * 0.8; // mostly on surface
      const theta = Math.random() * Math.PI * 2;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      const treePos = new Vector3(x, y - 3.5, z);

      const scatterPos = randomInSphere(10);

      data.push({
        id: i,
        treePosition: treePos,
        scatterPosition: scatterPos,
        scale,
        color,
        rotation: [0, 0, 0],
        speed: Math.random() * 0.2,
        phase: Math.random() * Math.PI,
        type: 'ORNAMENT'
      });
    }
    return data;
  }, []);

  // --- 3. Dust/Glow Data Generation ---
  const dust = useMemo(() => {
    const data: ParticleData[] = [];
    for (let i = 0; i < DUST_COUNT; i++) {
       const scale = Math.random() * 0.05 + 0.01;
       const treePos = randomInCone(8, 3.5, 4); // Wider aura around tree
       const scatterPos = randomInSphere(12);
       
       data.push({
         id: i,
         treePosition: treePos,
         scatterPosition: scatterPos,
         scale,
         color: new Color('#FFD700'),
         rotation: [0,0,0],
         speed: 0.1,
         phase: Math.random() * Math.PI,
         type: 'ORNAMENT'
       });
    }
    return data;
  }, []);

  // --- Initial Color Setup ---
  useLayoutEffect(() => {
    if (meshRef.current) {
      particles.forEach((p, i) => meshRef.current!.setColorAt(i, p.color));
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (ornamentRef.current) {
      ornaments.forEach((p, i) => ornamentRef.current!.setColorAt(i, p.color));
      ornamentRef.current.instanceMatrix.needsUpdate = true;
    }
    if (dustRef.current) {
        dust.forEach((p, i) => dustRef.current!.setColorAt(i, p.color));
        dustRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [particles, ornaments, dust]);

  // --- Animation Loop ---
  // Re-implementing useFrame with a ref for transition progress
  const progress = useRef(0);
  
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const target = treeState === TreeState.FORMED ? 1 : 0;
    // Lerp progress towards target
    // Use dampening for smooth cinematic feel
    progress.current = MathUtils.damp(progress.current, target, 2.5, delta);
    
    const t = progress.current;
    const easeT = t * t * (3 - 2 * t); // Smoothstep easing

    // Update Needles
    if (meshRef.current) {
      particles.forEach((p, i) => {
        // Position
        const curPos = new Vector3().lerpVectors(p.scatterPosition, p.treePosition, easeT);
        
        // Add ambient floating noise
        const noise = Math.sin(time * p.speed + p.phase) * (1 - easeT * 0.8); // Float more when scattered
        curPos.y += noise * 0.5;
        curPos.x += Math.cos(time * 0.5 + p.phase) * noise * 0.2;

        // Rotation: Needles point up in tree mode, random in scatter
        // We cheat by using LookAt or just lerping rotation? 
        // Let's just rotate the dummy object.
        dummy.position.copy(curPos);
        dummy.scale.setScalar(p.scale);
        
        // In tree mode, orient somewhat towards up/out
        dummy.rotation.set(
            MathUtils.lerp(p.rotation[0], -Math.PI / 2, easeT), // Point roughly up/out
            MathUtils.lerp(p.rotation[1], Math.atan2(p.treePosition.x, p.treePosition.z), easeT),
            MathUtils.lerp(p.rotation[2], 0, easeT)
        );
        
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Update Ornaments
    if (ornamentRef.current) {
      ornaments.forEach((p, i) => {
        const curPos = new Vector3().lerpVectors(p.scatterPosition, p.treePosition, easeT);
        
        // Ornaments float gently
        curPos.y += Math.sin(time * 2 + p.phase) * 0.05;

        dummy.position.copy(curPos);
        dummy.scale.setScalar(p.scale * (0.8 + 0.2 * Math.sin(time * 3 + p.id))); // Pulse size slightly
        dummy.rotation.set(0,0,0);
        dummy.updateMatrix();
        ornamentRef.current!.setMatrixAt(i, dummy.matrix);
      });
      ornamentRef.current.instanceMatrix.needsUpdate = true;
    }

    // Update Dust
    if (dustRef.current) {
        dust.forEach((p, i) => {
            // Dust is always somewhat chaotic but gathers around tree
            const curPos = new Vector3().lerpVectors(p.scatterPosition, p.treePosition, easeT);
            
            // Dust moves faster
            curPos.x += Math.sin(time * 0.5 + p.phase) * 0.5;
            curPos.y += Math.cos(time * 0.3 + p.phase) * 0.5;
            curPos.z += Math.sin(time * 0.4 + p.phase * 2) * 0.5;

            dummy.position.copy(curPos);
            dummy.scale.setScalar(p.scale * (1 + Math.sin(time * 10 + p.phase))); // Twinkle
            dummy.rotation.set(0,0,0);
            dummy.updateMatrix();
            dustRef.current!.setMatrixAt(i, dummy.matrix);
        });
        dustRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
        {/* Needles: Matte/Rough Emerald */}
        <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} castShadow receiveShadow>
            <coneGeometry args={[1, 3, 4]} /> {/* Low poly cone for needle */}
            <meshStandardMaterial 
                roughness={0.8} 
                metalness={0.1}
                flatShading={true}
            />
        </instancedMesh>

        {/* Ornaments: Shiny Gold */}
        <instancedMesh ref={ornamentRef} args={[undefined, undefined, ORNAMENT_COUNT]} castShadow>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial 
                color="#FFD700" 
                roughness={0.15} 
                metalness={0.9} 
                emissive="#B8860B"
                emissiveIntensity={0.2}
            />
        </instancedMesh>

        {/* Dust/Magic: Glowing particles */}
        <instancedMesh ref={dustRef} args={[undefined, undefined, DUST_COUNT]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#F3E5AB" toneMapped={false} />
        </instancedMesh>
    </group>
  );
};