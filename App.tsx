import React, { useState, Suspense, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Experience } from './components/Experience';
import { Overlay } from './components/Overlay';
import { HandController } from './components/HandController';
import { TreeState, InteractionRef } from './types';

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.FORMED);
  
  // Mutable interaction state to avoid re-rendering entire tree on every frame gesture
  const interactionRef = useRef<InteractionRef>({
    rotationVelocity: 0,
    zoomVelocity: 0,
    triggerFocus: false,
    targetMode: null
  });

  // Poll for mode changes from the Ref (driven by MediaPipe)
  useEffect(() => {
    const interval = setInterval(() => {
        const target = interactionRef.current.targetMode;
        if (target && target !== treeState) {
            setTreeState(target);
        }
    }, 100);
    return () => clearInterval(interval);
  }, [treeState]);

  const toggleState = () => {
    setTreeState((prev) => 
      prev === TreeState.FORMED ? TreeState.CHAOS : TreeState.FORMED
    );
  };

  return (
    <div className="w-full h-screen relative bg-arix-dark overflow-hidden">
      <Suspense fallback={null}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 2, 14], fov: 45, near: 0.1, far: 100 }}
          gl={{ 
            antialias: false, 
            alpha: false, 
            powerPreference: "high-performance",
            toneMappingExposure: 1.2
          }}
        >
          <color attach="background" args={['#000502']} />
          <Experience treeState={treeState} interactionRef={interactionRef} />
        </Canvas>
      </Suspense>
      
      <Overlay treeState={treeState} onToggle={toggleState} />
      <HandController interactionRef={interactionRef} />
      
      <Loader 
        containerStyles={{ background: '#000502' }} 
        innerStyles={{ width: '40vw', height: '2px', background: '#333' }}
        barStyles={{ background: '#FFD700', height: '2px' }}
        dataStyles={{ fontFamily: 'Cinzel', color: '#FFD700', fontSize: '12px', letterSpacing: '0.2em' }}
      />
    </div>
  );
};

export default App;