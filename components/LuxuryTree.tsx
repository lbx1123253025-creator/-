import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Vector3, Color, MathUtils, Mesh, DoubleSide } from 'three';
import { TreeState, ParticleData, InteractionRef } from '../types';
import * as THREE from 'three';

interface LuxuryTreeProps {
  treeState: TreeState;
  interactionRef: React.MutableRefObject<InteractionRef>;
}

const BRANCH_COUNT = 3000;
const BALL_COUNT = 200;
const HAT_COUNT = 40;
const SOCK_COUNT = 40;
const PHOTO_COUNT = 20;

// Utility: Random in Sphere
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

// Utility: Random in Cone (Tree)
const randomInCone = (height: number, maxRadius: number, yOffset: number, surfaceOnly = false): Vector3 => {
  const y = Math.random() * height;
  const rRadius = (1 - y / height) * maxRadius;
  const r = surfaceOnly ? rRadius * (0.85 + Math.random() * 0.15) : Math.sqrt(Math.random()) * rRadius;
  const theta = Math.random() * Math.PI * 2;
  
  const spiral = y * 10; 
  const x = r * Math.cos(theta + spiral);
  const z = r * Math.sin(theta + spiral);
  return new Vector3(x, y - yOffset, z);
};

export const LuxuryTree: React.FC<LuxuryTreeProps> = ({ treeState, interactionRef }) => {
  // Use a procedural texture to guarantee no network errors
  const photoTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Card Background
      ctx.fillStyle = '#f2f0e6';
      ctx.fillRect(0, 0, 512, 600);
      
      // Photo Placeholder area
      ctx.fillStyle = '#111';
      ctx.fillRect(40, 40, 432, 432);
      
      // Gradient / Art inside photo
      const grd = ctx.createLinearGradient(40, 40, 472, 472);
      grd.addColorStop(0, '#8B0000');
      grd.addColorStop(0.5, '#022D19');
      grd.addColorStop(1, '#B8860B');
      ctx.fillStyle = grd;
      ctx.fillRect(45, 45, 422, 422);
      
      // Festive Text
      ctx.fillStyle = '#B8860B';
      ctx.font = '600 32px "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.fillText("Joyeux Noël", 256, 540);
      ctx.font = 'italic 20px serif';
      ctx.fillStyle = '#555';
      ctx.fillText("Arix Collection", 256, 570);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const branchRef = useRef<InstancedMesh>(null);
  const ballRef = useRef<InstancedMesh>(null);
  const hatRef = useRef<InstancedMesh>(null);
  const sockRef = useRef<InstancedMesh>(null);
  const photoRef = useRef<InstancedMesh>(null);
  const frameRef = useRef<InstancedMesh>(null);
  
  const focusMeshRef = useRef<Mesh>(null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const hoverMeshRef = useRef<Mesh>(null);

  const dummy = useMemo(() => new Object3D(), []);

  // --- Data Generation ---
  const { branches, balls, hats, socks, photos } = useMemo(() => {
    // 1. Branches
    const brData: ParticleData[] = [];
    const greenPalette = ['#0f3d2e', '#1a5c42', '#08291e', '#2e8b57'];
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const pos = randomInCone(10, 4.0, 5.0);
      brData.push({
        id: i,
        treePosition: pos,
        scatterPosition: randomInSphere(15),
        scale: Math.random() * 0.3 + 0.3,
        color: new Color(greenPalette[Math.floor(Math.random() * greenPalette.length)]),
        rotation: [Math.random() * 0.5, Math.random() * Math.PI * 2, 0],
        speed: Math.random() * 0.5 + 0.1,
        phase: Math.random() * Math.PI * 2,
        type: 'NEEDLE'
      });
    }

    // 2. Balls
    const baData: ParticleData[] = [];
    const ballColors = ['#8B0000', '#FFD700', '#C0C0C0', '#B8860B'];
    for (let i = 0; i < BALL_COUNT; i++) {
       baData.push({
        id: i,
        treePosition: randomInCone(9, 3.8, 4.5, true),
        scatterPosition: randomInSphere(12),
        scale: Math.random() * 0.15 + 0.1,
        color: new Color(ballColors[Math.floor(Math.random() * ballColors.length)]),
        rotation: [0,0,0],
        speed: Math.random() * 0.2,
        phase: Math.random() * Math.PI,
        type: 'ORNAMENT'
       });
    }

    // 3. Hats
    const hData: ParticleData[] = [];
    for (let i = 0; i < HAT_COUNT; i++) {
        hData.push({
            id: i,
            treePosition: randomInCone(8, 3.5, 4.0, true),
            scatterPosition: randomInSphere(10),
            scale: 0.25,
            color: new Color('#D42426'),
            rotation: [0,0,0],
            speed: 0.2,
            phase: Math.random() * Math.PI,
            type: 'ORNAMENT'
        });
    }

    // 4. Socks
    const sData: ParticleData[] = [];
    for (let i = 0; i < SOCK_COUNT; i++) {
        sData.push({
            id: i,
            treePosition: randomInCone(7, 3.2, 3.5, true),
            scatterPosition: randomInSphere(10),
            scale: 0.2,
            color: new Color('#F0F0F0'),
            rotation: [0,0,0],
            speed: 0.25,
            phase: Math.random() * Math.PI,
            type: 'ORNAMENT'
        });
    }

    // 5. Photos
    const pData: ParticleData[] = [];
    for (let i = 0; i < PHOTO_COUNT; i++) {
        pData.push({
            id: i,
            treePosition: randomInCone(8, 3.5, 4.2, true),
            scatterPosition: randomInSphere(8),
            scale: 0.4,
            color: new Color('#FFFFFF'),
            rotation: [0,0,0],
            speed: 0.1,
            phase: Math.random() * Math.PI,
            type: 'PHOTO'
        })
    }

    return { branches: brData, balls: baData, hats: hData, socks: sData, photos: pData };
  }, []);

  useLayoutEffect(() => {
    if (branchRef.current) {
        branches.forEach((p, i) => branchRef.current!.setColorAt(i, p.color));
        branchRef.current.instanceMatrix.needsUpdate = true;
    }
    if (ballRef.current) {
        balls.forEach((p, i) => ballRef.current!.setColorAt(i, p.color));
        ballRef.current.instanceMatrix.needsUpdate = true;
    }
    if (hatRef.current) {
        hats.forEach((p, i) => hatRef.current!.setColorAt(i, p.color));
        hatRef.current.instanceMatrix.needsUpdate = true;
    }
    if (sockRef.current) {
        socks.forEach((p, i) => sockRef.current!.setColorAt(i, p.color));
        sockRef.current.instanceMatrix.needsUpdate = true;
    }
    if (frameRef.current) {
        for(let i=0; i<PHOTO_COUNT; i++) frameRef.current.setColorAt(i, new Color('#FFD700'));
        frameRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [branches, balls, hats, socks, photos]);

  const transitionProgress = useRef(treeState === TreeState.FORMED ? 1 : 0);
  const currentRotation = useRef(0);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    if (interactionRef.current.triggerFocus) {
        if (focusId === null) {
            setFocusId(Math.floor(Math.random() * PHOTO_COUNT));
        } else {
            setFocusId(null);
        }
        interactionRef.current.triggerFocus = false; 
    }

    currentRotation.current += interactionRef.current.rotationVelocity;
    
    const target = treeState === TreeState.FORMED ? 1 : 0;
    transitionProgress.current = MathUtils.damp(transitionProgress.current, target, 2.5, delta);
    const t = transitionProgress.current;
    const easeT = t * t * (3 - 2 * t);
    
    const treeRotY = currentRotation.current + time * 0.05 * t;

    // Branches
    if (branchRef.current) {
        branchRef.current.rotation.y = treeRotY;
        branches.forEach((p, i) => {
            const curPos = new Vector3().lerpVectors(p.scatterPosition, p.treePosition, easeT);
            curPos.y += Math.sin(time * 2 + p.phase) * 0.05 * (1 - easeT * 0.5); 
            dummy.position.copy(curPos);
            dummy.scale.setScalar(p.scale * (0.5 + 0.5 * easeT)); 
            dummy.lookAt(0, curPos.y, 0);
            dummy.rotateY(Math.PI);
            dummy.rotateX(0.2);
            dummy.rotateZ(Math.sin(time + p.phase) * 0.1); 
            dummy.updateMatrix();
            branchRef.current!.setMatrixAt(i, dummy.matrix);
        });
        branchRef.current.instanceMatrix.needsUpdate = true;
    }

    // Balls
    if (ballRef.current) {
        ballRef.current.rotation.y = treeRotY;
        balls.forEach((p, i) => {
            const curPos = new Vector3().lerpVectors(p.scatterPosition, p.treePosition, easeT);
            curPos.y += Math.sin(time * 1.5 + p.phase) * 0.02;
            dummy.position.copy(curPos);
            dummy.scale.setScalar(p.scale);
            dummy.rotation.set(0,0,0);
            dummy.updateMatrix();
            ballRef.current!.setMatrixAt(i, dummy.matrix);
        });
        ballRef.current.instanceMatrix.needsUpdate = true;
    }

    // Hats
    if (hatRef.current) {
        hatRef.current.rotation.y = treeRotY;
        hats.forEach((p, i) => {
            const curPos = new Vector3().lerpVectors(p.scatterPosition, p.treePosition, easeT);
            dummy.position.copy(curPos);
            dummy.lookAt(0, curPos.y, 0);
            dummy.rotateY(Math.PI);
            dummy.rotateX(-0.2);
            dummy.scale.setScalar(p.scale);
            dummy.updateMatrix();
            hatRef.current!.setMatrixAt(i, dummy.matrix);
        });
        hatRef.current.instanceMatrix.needsUpdate = true;
    }

    // Socks
    if (sockRef.current) {
        sockRef.current.rotation.y = treeRotY;
        socks.forEach((p, i) => {
            const curPos = new Vector3().lerpVectors(p.scatterPosition, p.treePosition, easeT);
            curPos.y -= 0.2; 
            dummy.position.copy(curPos);
            dummy.lookAt(0, curPos.y, 0);
            dummy.rotateY(Math.PI);
            const swing = Math.sin(time * 3 + p.phase) * 0.2;
            dummy.rotateZ(swing);
            dummy.scale.setScalar(p.scale);
            dummy.updateMatrix();
            sockRef.current!.setMatrixAt(i, dummy.matrix);
        });
        sockRef.current.instanceMatrix.needsUpdate = true;
    }

    // Photos & Frames
    if (photoRef.current) photoRef.current.rotation.y = treeRotY;
    if (frameRef.current) frameRef.current.rotation.y = treeRotY;
    if (hoverMeshRef.current) hoverMeshRef.current.rotation.y = treeRotY;

    if (photoRef.current && frameRef.current) {
        photos.forEach((p, i) => {
            if (i === focusId) {
                dummy.scale.setScalar(0);
                photoRef.current!.setMatrixAt(i, dummy.matrix);
                frameRef.current!.setMatrixAt(i, dummy.matrix);
            } else {
                const curPos = new Vector3().lerpVectors(p.scatterPosition, p.treePosition, easeT);
                dummy.position.copy(curPos);
                dummy.lookAt(0, curPos.y, 0); 
                dummy.rotateY(Math.PI);
                let scale = p.scale;
                if (i === hoveredId && hoveredId !== null) scale *= 1.15;
                dummy.scale.setScalar(scale);
                dummy.updateMatrix();
                photoRef.current!.setMatrixAt(i, dummy.matrix);
                frameRef.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        photoRef.current.instanceMatrix.needsUpdate = true;
        frameRef.current.instanceMatrix.needsUpdate = true;
    }

    // Focus Mesh
    if (focusId !== null && focusMeshRef.current) {
        const targetPos = new Vector3(0, 1.5, 11);
        focusMeshRef.current.position.lerp(targetPos, delta * 4);
        focusMeshRef.current.lookAt(0, 2, 14);
        focusMeshRef.current.scale.lerp(new Vector3(3.5, 3.5, 3.5), delta * 4);
        focusMeshRef.current.position.y += Math.sin(time) * 0.005;
    }

    // Hover Mesh
    if (hoveredId !== null && hoverMeshRef.current && hoveredId !== focusId) {
        const p = photos[hoveredId];
        const curPos = new Vector3().lerpVectors(p.scatterPosition, p.treePosition, easeT);
        hoverMeshRef.current.position.copy(curPos);
        hoverMeshRef.current.lookAt(0, curPos.y, 0);
        hoverMeshRef.current.rotateY(Math.PI);
        hoverMeshRef.current.scale.setScalar(p.scale * 1.25);
        hoverMeshRef.current.visible = true;
    } else if (hoverMeshRef.current) {
        hoverMeshRef.current.visible = false;
    }
  });

  return (
    <group>
      {/* 1. Foliage */}
      <instancedMesh ref={branchRef} args={[undefined, undefined, BRANCH_COUNT]} castShadow receiveShadow>
        <planeGeometry args={[1, 1.5, 1, 1]} />
        <meshStandardMaterial 
            color="#022D19" 
            roughness={0.9} 
            side={DoubleSide}
            transparent
            alphaTest={0.5}
        />
      </instancedMesh>

      {/* 2. Balls */}
      <instancedMesh ref={ballRef} args={[undefined, undefined, BALL_COUNT]} castShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial 
            roughness={0.15} 
            metalness={0.9} 
            clearcoat={1} 
            envMapIntensity={2}
        />
      </instancedMesh>

      {/* 3. Hats */}
      <instancedMesh ref={hatRef} args={[undefined, undefined, HAT_COUNT]} castShadow>
          <coneGeometry args={[0.8, 1.6, 32]} />
          <meshStandardMaterial color="#D42426" roughness={0.6} />
      </instancedMesh>

      {/* 4. Socks */}
      <instancedMesh ref={sockRef} args={[undefined, undefined, SOCK_COUNT]} castShadow>
          <capsuleGeometry args={[0.5, 1.5, 4, 8]} />
          <meshStandardMaterial color="#F0F0F0" roughness={0.9} />
      </instancedMesh>

      {/* 5. Frames */}
      <instancedMesh ref={frameRef} args={[undefined, undefined, PHOTO_COUNT]} castShadow>
          <boxGeometry args={[1.1, 1.3, 0.05]} /> 
          <meshStandardMaterial color="#FFD700" roughness={0.2} metalness={1} />
      </instancedMesh>

      {/* 6. Photos */}
      <instancedMesh 
        ref={photoRef} 
        args={[undefined, undefined, PHOTO_COUNT]}
        onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredId(e.instanceId);
            document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
            setHoveredId(null);
            document.body.style.cursor = 'auto';
        }}
      >
          <planeGeometry args={[1, 1.2]} onUpdate={(self) => self.translate(0, 0, 0.06)} />
          <meshStandardMaterial 
            map={photoTexture}
            roughness={0.4} 
            metalness={0.1} 
            side={DoubleSide} 
          />
      </instancedMesh>

      {/* Hover */}
      <mesh ref={hoverMeshRef} visible={false}>
          <planeGeometry args={[1.2, 1.4]} />
          <meshBasicMaterial color="#FFFFFF" wireframe />
      </mesh>

      {/* Independent Focus */}
      {focusId !== null && (
          <group ref={focusMeshRef} renderOrder={9999}>
              <mesh position={[0,0,0.06]}>
                  <planeGeometry args={[1, 1.2]} />
                  <meshBasicMaterial map={photoTexture} depthTest={false} toneMapped={false} />
              </mesh>
              <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[1.1, 1.3, 0.05]} />
                  <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.2} />
              </mesh>
          </group>
      )}
    </group>
  );
};