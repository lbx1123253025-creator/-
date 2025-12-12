import { Vector3, Color } from 'three';

export enum TreeState {
  CHAOS = 'CHAOS',
  FORMED = 'FORMED'
}

export interface ParticleData {
  id: number;
  scatterPosition: Vector3;
  treePosition: Vector3;
  scale: number;
  color: Color;
  rotation: [number, number, number];
  speed: number;
  phase: number;
  type: 'NEEDLE' | 'ORNAMENT' | 'PHOTO';
}

export interface InteractionState {
  mode: TreeState;
  rotationY: number;
  zoomLevel: number; // 0 to 1
  focusActive: boolean;
  focusedPhotoId: number | null;
}

// Mutable ref object for high-frequency updates from HandController
export interface InteractionRef {
  rotationVelocity: number;
  zoomVelocity: number;
  triggerFocus: boolean; // One-shot trigger
  targetMode: TreeState | null; // Null means no change requested
}