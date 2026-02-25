export interface ImageItem {
  id: string; // Unique ID for keying
  url: string;
  name: string;
  size: number;
}

export interface Settings {
  // Unit & Spacing
  aspectRatio: string; // '0.5625' | '0.75' | '1' | '1.333' | 'custom'
  customW: number;
  customH: number;
  gap: number;

  // Numbering
  showNum: boolean;
  startNumber: number;
  fontSize: number;
  fontWeight: string; // '300' | '400' | '500' | '700' | '900'
  fontColor: string;
  enableStroke: boolean;
  fontStrokeColor: string;
  fontShadowColor: string;
  enableShadow: boolean;
  fontFamily: string;
  fontPos: string; // 'bottom-center' etc.

  // Layout
  cols: number;
  groupRows: number;
  
  // Overlay
  overlayImgUrl: string | null;
  overlayMode: string;
  overlayOpacity: number;
  
  // Quality
  qualityVal: number; // 1-100
  
  // Masking
  maskMode: 'line' | 'image'; // Added for persistence
  maskIndices: string;
  maskColor: string;
  maskWidth: number;
  lineStyle: 'cross' | 'slash';
  
  // Sticker
  stickerImgUrl: string | null;
  stickerSize: number;
  stickerX: number;
  stickerY: number;
}

export type MaskMode = 'line' | 'image';
