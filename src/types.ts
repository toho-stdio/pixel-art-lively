export const WIDTH = 640;
export const HEIGHT = 400;
export type PaletteName = 'jade' | 'golden' | 'moon';
export interface Settings {
  depth: boolean; sky: boolean; reflections: boolean; shoreline: boolean;
  backBank: boolean; particles: boolean; rain: number; distortion: number; speed: number;
  wind: number; palette: PaletteName; paused: boolean;
}
export interface Ripple { x: number; y: number; born: number; strength: number; }
export interface VillageScene {
  ground: HTMLCanvasElement;
  foreground: HTMLCanvasElement;
  mask: Uint8Array;
  bankY: Int16Array;
  renderObjects(time: number, wind: number): HTMLCanvasElement;
}
export interface WaterRenderer {
  canvas: HTMLCanvasElement;
  addRipple(x: number, y: number, time: number, strength?: number): boolean;
  render(time: number, settings: Settings, objects: HTMLCanvasElement): void;
  readonly rippleCount: number;
}
export const defaultSettings: Settings = {
  depth: true, sky: true, reflections: true, shoreline: true, backBank: true, particles: true,
  rain: 0, distortion: 2, speed: 1, wind: 0.6, palette: 'jade', paused: false,
};
