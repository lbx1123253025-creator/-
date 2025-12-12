import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { TreeState, InteractionRef } from '../types';

interface HandControllerProps {
  interactionRef: React.MutableRefObject<InteractionRef>;
}

export const HandController: React.FC<HandControllerProps> = ({ interactionRef }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Gesture State
  const lastPinchTime = useRef<number>(0);
  const pinchCount = useRef<number>(0);
  const isPinching = useRef<boolean>(false);

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        if (videoRef.current && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 320, height: 240 } 
          });
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', () => {
            setLoaded(true);
            predict();
          });
        } else {
            setError("Camera not supported or available");
        }
      } catch (err) {
        console.warn("Hand tracking initialization failed:", err);
        setError("Camera access denied or device not found");
      }
    };

    const predict = () => {
      if (!handLandmarker || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        const results = handLandmarker.detectForVideo(video, performance.now());
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (results.landmarks && results.landmarks.length > 0) {
          // Draw wireframe (Simplified)
          ctx.strokeStyle = '#00FF88';
          ctx.lineWidth = 2;
          
          results.landmarks.forEach((landmarks) => {
            // Visualize Landmarks
            landmarks.forEach(lm => {
              ctx.beginPath();
              ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 2, 0, 2 * Math.PI);
              ctx.stroke();
            });

            // --- Gesture Logic ---
            
            // 1. Hand Open vs Fist (Thumb tip vs Index tip distance isn't enough, check all fingers)
            // Simple heuristic: Average distance of finger tips to wrist
            const wrist = landmarks[0];
            const tips = [4, 8, 12, 16, 20].map(i => landmarks[i]);
            const avgDist = tips.reduce((acc, tip) => {
              return acc + Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
            }, 0) / 5;

            // Normalize dist roughly (depends on hand z, but let's approximate)
            // Fist: avgDist small. Open: avgDist large.
            if (avgDist < 0.2) {
               interactionRef.current.targetMode = TreeState.FORMED;
            } else if (avgDist > 0.4) {
               interactionRef.current.targetMode = TreeState.CHAOS;
            } else {
               interactionRef.current.targetMode = null; 
            }

            // 2. Pinch (Thumb tip 4 and Index tip 8)
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
            
            const pinchThreshold = 0.05;
            
            if (pinchDist < pinchThreshold) {
              if (!isPinching.current) {
                // Just started pinching
                isPinching.current = true;
                const now = performance.now();
                if (now - lastPinchTime.current < 500) {
                   pinchCount.current++;
                } else {
                   pinchCount.current = 1;
                }
                lastPinchTime.current = now;

                if (pinchCount.current === 2) {
                   interactionRef.current.triggerFocus = true;
                   pinchCount.current = 0;
                }
              }
              // While pinching (Drag rotation)
              interactionRef.current.rotationVelocity = (landmarks[0].x - 0.5) * 0.1;
            } else {
              isPinching.current = false;
              interactionRef.current.rotationVelocity = 0;
            }

            // 3. Vertical Move (Zoom)
            // Map hand Y position (inverted in screen coords) to zoom
            // y: 0 (top) -> 1 (bottom). 
            // If hand is high (y < 0.3) zoom in. Low (y > 0.7) zoom out.
            if (landmarks[0].y < 0.3) interactionRef.current.zoomVelocity = 0.05;
            else if (landmarks[0].y > 0.7) interactionRef.current.zoomVelocity = -0.05;
            else interactionRef.current.zoomVelocity = 0;

          });
        } else {
          // No hands
          interactionRef.current.rotationVelocity = 0;
          interactionRef.current.zoomVelocity = 0;
        }
      }
      
      animationFrameId = requestAnimationFrame(predict);
    };

    setupMediaPipe();

    return () => {
      if (handLandmarker) handLandmarker.close();
      cancelAnimationFrame(animationFrameId);
    };
  }, [interactionRef]);

  if (error) {
    return (
        <div className="fixed bottom-14 left-4 z-50 p-2 bg-black/50 backdrop-blur-md rounded text-[10px] text-red-400 font-display">
            Hand Tracking Unavailable
        </div>
    );
  }

  return (
    <div className="fixed bottom-14 left-4 z-50 flex flex-col items-center">
      {/* Hidden Video Feed */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      
      {/* Debug Visualization */}
      <div className="relative border border-arix-emerald/50 bg-black/40 rounded-lg overflow-hidden backdrop-blur-md shadow-[0_0_15px_rgba(0,255,136,0.2)]">
        <canvas ref={canvasRef} width={160} height={120} className="hand-tracker-canvas w-[160px] h-[120px]" />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-arix-gold text-[10px] font-display animate-pulse">
            Initializing Vision...
          </div>
        )}
      </div>
      <p className="text-[10px] text-arix-gold/50 font-display mt-2 tracking-widest uppercase">
        Hand Tracking Active
      </p>
    </div>
  );
};