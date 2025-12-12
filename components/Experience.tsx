import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { LuxuryTree } from './LuxuryTree';
import { AmbientSystem } from './AmbientSystem';
import { TreeState, InteractionRef } from '../types';
import * as THREE from 'three';

interface ExperienceProps {
  treeState: TreeState;
  interactionRef: React.MutableRefObject<InteractionRef>;
}

export const Experience: React.FC<ExperienceProps> = ({ treeState, interactionRef }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  useFrame((state, delta) => {
      // Handle Zoom Interaction
      if (cameraRef.current) {
          const zoomVel = interactionRef.current.zoomVelocity;
          if (Math.abs(zoomVel) > 0.001) {
             const vec = new THREE.Vector3(0, 0, 0);
             const pos = cameraRef.current.position;
             const dist = pos.length();
             
             // Simple zoom in/out by moving camera along vector to origin
             if ((dist > 5 && zoomVel > 0) || (dist < 20 && zoomVel < 0)) {
                 pos.lerp(vec, zoomVel * delta * 5);
             }
          }
      }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 2, 14]} fov={50} />
      <OrbitControls 
        enablePan={false} 
        enableZoom={false} // Handled manually
        minPolarAngle={Math.PI / 3} 
        maxPolarAngle={Math.PI / 1.8}
        autoRotate={treeState === TreeState.FORMED && interactionRef.current.rotationVelocity === 0}
        autoRotateSpeed={0.5}
      />

      {/* Luxury Lighting Setup */}
      {/* Background is handled by HTML body color #000502 */}
      
      {/* 1. Main Gold Key Light */}
      <spotLight 
        position={[10, 15, 10]} 
        angle={0.4} 
        penumbra={1} 
        intensity={3} 
        castShadow 
        color="#FFD700"
        shadow-bias={-0.0001}
      />

      {/* 2. Deep Emerald Rim Light */}
      <spotLight 
        position={[-10, 5, -8]} 
        angle={0.6} 
        penumbra={1} 
        intensity={4} 
        color="#006633" 
      />

      {/* 3. Red Accent Fill (Subtle) */}
      <pointLight position={[0, -5, 5]} intensity={0.8} color="#8B0000" distance={10} />

      {/* 4. Top Sparkle Light */}
      <pointLight position={[0, 10, 0]} intensity={2} color="#FFFFFF" distance={5} />

      <group position={[0, -2.5, 0]}>
        <LuxuryTree treeState={treeState} interactionRef={interactionRef} />
        <AmbientSystem treeState={treeState} />
      </group>

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <EffectComposer disableNormalPass>
        <Bloom 
            luminanceThreshold={0.7} 
            mipmapBlur 
            intensity={1.2} 
            radius={0.5}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.6} />
        <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
      </EffectComposer>
    </>
  );
};