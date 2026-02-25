import React, { useEffect, useRef, memo } from 'react';
import Sortable from 'sortablejs';
import { ImageItem } from './types';

interface ImageGridProps {
  images: ImageItem[];
  onReorder: (oldIndex: number, newIndex: number) => void;
  onImageClick: (index: number) => void;
  duplicatesCount: number;
  onRemoveDuplicates: () => void;
  onClearAll: () => void;
}

const ImageGrid = memo(({ images, onReorder, onImageClick, duplicatesCount, onRemoveDuplicates, onClearAll }: ImageGridProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const sortableRef = useRef<Sortable | null>(null);

  useEffect(() => {
    if (gridRef.current && !sortableRef.current) {
      sortableRef.current = new Sortable(gridRef.current, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        delay: 100,
        delayOnTouchOnly: true,
        onEnd: (evt) => {
          if (evt.oldIndex !== undefined && evt.newIndex !== undefined) {
            onReorder(evt.oldIndex, evt.newIndex);
          }
        }
      });
    }
    
    // Cleanup not strictly necessary for singleton sortable but good practice if component unmounts
    return () => {
        // We generally keep the instance unless the grid element is destroyed
    };
  }, [onReorder]);

  return (
    <div className="ios-card">
      <details className="group" open>
        <summary className="flex justify-between items-center p-4 bg-white cursor-pointer select-none active:bg-gray-50 transition">
          <span className="text-[13px] text-gray-500 uppercase font-medium pl-1">
            已导入 <span id="countBadge">{images.length}</span> 张
            <span className="text-[10px] text-[#007AFF] bg-[#007AFF]/10 px-1.5 py-0.5 rounded ml-2 font-bold">支持长按拖拽排序</span>
          </span>
          <div className="flex items-center gap-3">
            {images.length > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClearAll();
                }}
                className="text-[#FF3B30] text-[13px] active:opacity-50 transition"
                id="clearBtn"
              >
                清空
              </button>
            )}
            <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </summary>
        <div className="p-4 pt-0 border-t border-gray-100">
          <div ref={gridRef} id="imageGrid" className="grid grid-cols-4 gap-2 overflow-y-auto max-h-[220px] min-h-[100px] no-scrollbar touch-pan-y mt-4">
            {images.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <span className="text-gray-400 text-sm">导入图片 (点击可替换/长按拖拽)</span>
                <span className="text-xs text-green-500 font-bold">已启用断点续存 & 批量优化</span>
              </div>
            )}
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100 thumbnail-item active:opacity-80 transition cursor-grab active:cursor-grabbing"
                onMouseUp={() => onImageClick(idx)}
              >
                <img src={img.url} className="w-full h-full object-cover pointer-events-none select-none" loading="lazy" alt="" />
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
});

export default ImageGrid;
