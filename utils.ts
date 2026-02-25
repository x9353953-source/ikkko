import { ImageItem, Settings } from './types';

// --- IndexedDB Helper ---
const DB_NAME = 'PuzzleProDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveImageToDB = async (item: ImageItem, blob: Blob) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ ...item, blob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const saveImagesToDB = async (items: { item: ImageItem; blob: Blob }[]) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    items.forEach(({ item, blob }) => {
      store.put({ ...item, blob });
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadImagesFromDB = async (): Promise<(ImageItem & { blob: Blob })[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const clearImagesDB = async () => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteImageFromDB = async (id: string) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Helper to get current ratio
export const getRatio = (settings: Settings): number => {
  if (settings.aspectRatio !== 'custom') {
    return parseFloat(settings.aspectRatio);
  }
  const w = settings.customW || 1000;
  const h = settings.customH || 1500;
  return w / h;
};

// Helper to parse mask indices string
export const parseMaskIndices = (input: string): number[] => {
  const maskTargets: number[] = [];
  const parts = input.split(/[,，、\s]+/);
  parts.forEach(part => {
      part = part.trim(); if (!part) return;
      const standardPart = part.replace(/[~—–]/g, '-');
      if (standardPart.includes('-')) {
          const rangeParts = standardPart.split('-');
          if (rangeParts.length === 2) { 
            const s = parseInt(rangeParts[0]); 
            const e = parseInt(rangeParts[1]); 
            if (!isNaN(s) && !isNaN(e)) { 
              for (let k = Math.min(s,e); k <= Math.max(s,e); k++) maskTargets.push(k); 
            } 
          }
      } else { 
        const num = parseInt(standardPart); 
        if (!isNaN(num)) maskTargets.push(num); 
      }
  });
  return maskTargets;
};

// Async Draw Function - The Core Engine
export const drawAsync = async (
  ctx: CanvasRenderingContext2D,
  imgs: string[],
  rows: number,
  cols: number,
  w: number,
  h: number,
  gap: number,
  globalOffset: number,
  startNum: number,
  maskIndices: number[],
  settings: Settings,
  applyMask: boolean,
  isCancelled: () => boolean,
  forceHideNums: boolean = false
) => {
  if (isCancelled()) return;
  const canvas = ctx.canvas;
  canvas.width = cols * w + (cols - 1) * gap;
  canvas.height = rows * h + (rows - 1) * gap;
  
  // Fill background
  ctx.fillStyle = '#FFFFFF'; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const {
      showNum,
      fontSize,
      fontWeight,
      fontPos,
      fontFamily,
      fontColor,
      enableStroke,
      fontStrokeColor,
      fontShadowColor,
      enableShadow,
      lineStyle,
      maskColor,
      maskWidth,
      stickerSize,
      stickerX,
      stickerY,
      overlayImgUrl,
      overlayOpacity,
      overlayMode
  } = settings;

  // Load Sticker Image if needed
  let stickerImgObj: HTMLImageElement | null = null;
  if (settings.stickerImgUrl) {
      stickerImgObj = new Image();
      stickerImgObj.src = settings.stickerImgUrl;
      await new Promise(r => { 
        if(stickerImgObj!.complete) r(true);
        else stickerImgObj!.onload = () => r(true);
        stickerImgObj!.onerror = () => r(true);
      });
  }

  // Load Overlay Image if needed
  let overlayImgObj: HTMLImageElement | null = null;
  if (overlayImgUrl) {
    overlayImgObj = new Image();
    overlayImgObj.src = overlayImgUrl;
    await new Promise(r => {
        if(overlayImgObj!.complete) r(true);
        else overlayImgObj!.onload = () => r(true);
        overlayImgObj!.onerror = () => r(true);
    });
  }

  for (let i = 0; i < imgs.length; i++) {
      if (isCancelled()) return;
      // Memory Optimization: Yield every 10 images to prevent UI freeze and allow GC
      if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));

      const r = Math.floor(i / cols);
      const c = i % cols;
      const x = c * (w + gap);
      const y = r * (h + gap);
      
      const currentNum = startNum + globalOffset + i;
      let img: HTMLImageElement | null = new Image();
      
      // Robust loading with retry
      const loadImg = (src: string, retries = 2): Promise<void> => {
          return new Promise(resolve => {
              if(!img) return resolve();
              img.onload = () => resolve();
              img.onerror = () => {
                  if (retries > 0) {
                      setTimeout(() => {
                           if(img) img.src = src; 
                           loadImg(src, retries - 1).then(resolve);
                      }, 200);
                  } else {
                      (img as any).isBroken = true; 
                      resolve();
                  }
              };
              img.src = src;
          });
      };
      
      await loadImg(imgs[i]);

      if (isCancelled()) return;

      try {
          // Strict check: must exist, not be broken, and have valid dimensions
          if (!img || (img as any).isBroken || img.naturalWidth === 0 || img.naturalHeight === 0 || !img.complete) {
              // Attempt to draw a placeholder or just skip
              ctx.fillStyle = '#f0f0f0';
              ctx.fillRect(x, y, w, h);
              ctx.fillStyle = '#ccc';
              ctx.font = `bold ${w/10}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.fillText('!', x + w/2, y + h/2);
          } else {
              ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
              const iRatio = img.width / img.height; 
              const cRatio = w / h;
              if (iRatio > cRatio) { 
                  ctx.drawImage(img, x - (h*iRatio - w)/2, y, h*iRatio, h); 
              } else { 
                  ctx.drawImage(img, x, y - (w/iRatio - h)/2, w, w/iRatio); 
              }
              ctx.restore();
          }
      } catch (err) {
          console.warn(`Skipped broken image index:${i}`, err);
          ctx.fillStyle = '#eee'; ctx.fillRect(x, y, w, h); 
      } finally {
          // Explicit memory release
          if(img) {
            img.src = '';
            img.remove();
            img = null;
          }
      }

      // Draw Number
      if (showNum && forceHideNums !== true) {
          ctx.save();
          // Updated Font Construction
          const fWeight = fontWeight || 'bold';
          ctx.font = `${fWeight} ${fontSize}px ${fontFamily}`; 
          
          let tx = x + w/2, ty = y + h - fontSize/2;
          
          if(fontPos === 'center') ty = y + h/2 + fontSize/3; 
          else if(fontPos.includes('top')) ty = y + fontSize + 20;
          
          if(fontPos.includes('left')) { tx = x + 20; ctx.textAlign = 'left'; } 
          else if(fontPos.includes('right')) { tx = x + w - 20; ctx.textAlign = 'right'; } 
          else ctx.textAlign = 'center';

          if (enableStroke) {
            ctx.lineWidth = fontSize / 12;
            ctx.strokeStyle = fontStrokeColor; 
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.strokeText(currentNum.toString(), tx, ty);
          }

          if (enableShadow) {
              ctx.shadowColor = fontShadowColor;
              ctx.shadowBlur = fontSize / 10;
              ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
          } else {
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
          }
          ctx.fillStyle = fontColor;
          ctx.fillText(currentNum.toString(), tx, ty);
          ctx.restore(); 
      }
      
      // Draw Mask / Sticker
      if (applyMask && maskIndices.includes(currentNum)) {
          if (stickerImgObj && stickerImgObj.complete && stickerImgObj.naturalWidth > 0) {
              const sizePct = stickerSize / 100;
              const xPct = stickerX / 100; 
              const yPct = stickerY / 100;
              const sw = w * sizePct; 
              const sh = sw * (stickerImgObj.height / stickerImgObj.width);
              ctx.drawImage(stickerImgObj, x + (w * xPct) - sw/2, y + (h * yPct) - sh/2, sw, sh);
          } else if (!stickerImgObj) {
              // Line mode
              ctx.beginPath();
              ctx.strokeStyle = maskColor; 
              ctx.lineWidth = maskWidth * (w/500) * 5; 
              ctx.lineCap = 'round';
              if (lineStyle === 'cross') { 
                  ctx.moveTo(x+w*0.2, y+h*0.2); ctx.lineTo(x+w*0.8, y+h*0.8); 
                  ctx.moveTo(x+w*0.8, y+h*0.2); ctx.lineTo(x+w*0.2, y+h*0.8); 
              } else { 
                  ctx.moveTo(x+w*0.2, y+h*0.8); ctx.lineTo(x+w*0.8, y+h*0.2); 
              }
              ctx.stroke();
          }
      }
  }

  // Draw Global Overlay
  if (overlayImgObj && overlayImgObj.complete && overlayImgObj.naturalWidth > 0) { 
      ctx.save();
      ctx.globalAlpha = overlayOpacity;
      // Valid composite operations
      ctx.globalCompositeOperation = overlayMode as GlobalCompositeOperation; 
      ctx.drawImage(overlayImgObj, 0, 0, canvas.width, canvas.height); 
      ctx.restore();
  }
};
