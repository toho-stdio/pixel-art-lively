import type { VillageScene } from '../types';
export type ResolutionKey = '320x180' | '480x270' | '640x360' | '960x540';
export const RESOLUTIONS = [
  { key: '320x180', width: 320, height: 180, label: 'Classic · 6 px', scale1080: 6 },
  { key: '480x270', width: 480, height: 270, label: 'Refined · 4 px', scale1080: 4 },
  { key: '640x360', width: 640, height: 360, label: 'Modern · 3 px', scale1080: 3 },
  { key: '960x540', width: 960, height: 540, label: 'High-detail · 2 px', scale1080: 2 },
] as const;
export const DEFAULT_RESOLUTION: ResolutionKey = '640x360';
/** The same 711.111×400 world viewport at every 16:9 resolution.
 * Existing 640×400 authored composition is centered, extending 35.556 world units per side.
 * Uniform scale preserves proportions; no anisotropic squeeze or crop.
 */
export interface StudyCamera { width: number; height: number; scale: number; offsetX: number; }
export function createCamera(width: number, height: number): StudyCamera {
  return { width, height, scale: height / 400, offsetX: (width - 640 * (height / 400)) / 2 };
}
export interface StudyScene extends VillageScene { camera: StudyCamera; }
