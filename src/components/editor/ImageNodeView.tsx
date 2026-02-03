import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Crop, Lock, Unlock, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ImageNodeViewComponent = ({
  node, 
  updateAttributes, 
  deleteNode,
  selected,
  editor,
  getPos,
}: NodeViewProps) => {
  const { src, alt, width, height } = node.attrs;
  
  const [isResizing, setIsResizing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [showToolbar, setShowToolbar] = useState(false);
  
  // Current dimensions for resizing
  const [currentWidth, setCurrentWidth] = useState<number | null>(width || null);
  const [currentHeight, setCurrentHeight] = useState<number | null>(height || null);
  
  // Crop state
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [isCropDragging, setIsCropDragging] = useState(false);
  const [cropDragType, setCropDragType] = useState<string | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number; aspectRatio: number } | null>(null);
  const cropStartRef = useRef<{ x: number; y: number; area: typeof cropArea } | null>(null);

  // Initialize dimensions when image loads
  const handleImageLoad = useCallback(() => {
    if (imageRef.current && !currentWidth && !currentHeight) {
      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;
      
      // Cap initial size
      const maxWidth = 600;
      let initialWidth: number;
      let initialHeight: number;
      
      if (naturalWidth > maxWidth) {
        const ratio = maxWidth / naturalWidth;
        initialWidth = maxWidth;
        initialHeight = Math.round(naturalHeight * ratio);
      } else {
        initialWidth = naturalWidth;
        initialHeight = naturalHeight;
      }
      
      setCurrentWidth(initialWidth);
      setCurrentHeight(initialHeight);
      
      // Сразу сохраняем в атрибуты узла чтобы избежать скачков при ресайзе
      updateAttributes({ width: initialWidth, height: initialHeight });
    }
  }, [currentWidth, currentHeight, updateAttributes]);

  // Show toolbar when selected
  useEffect(() => {
    setShowToolbar(selected);
  }, [selected]);

  // Refs для актуальных размеров во время ресайза
  const currentDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const startWidth = currentWidth || rect.width;
    const startHeight = currentHeight || rect.height;
    
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: startWidth,
      height: startHeight,
      aspectRatio: startWidth / startHeight,
    };
    
    currentDimensionsRef.current = { width: startWidth, height: startHeight };
    
    setIsResizing(true);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeStartRef.current) return;
      
      const deltaX = moveEvent.clientX - resizeStartRef.current.x;
      const deltaY = moveEvent.clientY - resizeStartRef.current.y;
      
      let newWidth = resizeStartRef.current.width;
      let newHeight = resizeStartRef.current.height;
      
      // Calculate new dimensions based on corner
      if (corner.includes('e')) {
        newWidth = Math.max(50, resizeStartRef.current.width + deltaX);
      }
      if (corner.includes('w')) {
        newWidth = Math.max(50, resizeStartRef.current.width - deltaX);
      }
      if (corner.includes('s')) {
        newHeight = Math.max(50, resizeStartRef.current.height + deltaY);
      }
      if (corner.includes('n')) {
        newHeight = Math.max(50, resizeStartRef.current.height - deltaY);
      }
      
      // Maintain aspect ratio if enabled
      if (keepAspectRatio) {
        if (corner.includes('e') || corner.includes('w')) {
          newHeight = newWidth / resizeStartRef.current.aspectRatio;
        } else {
          newWidth = newHeight * resizeStartRef.current.aspectRatio;
        }
      }
      
      // Ограничиваем максимальный размер
      const maxWidth = 1200;
      const maxHeight = 1200;
      if (newWidth > maxWidth) {
        newWidth = maxWidth;
        if (keepAspectRatio) {
          newHeight = newWidth / resizeStartRef.current.aspectRatio;
        }
      }
      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        if (keepAspectRatio) {
          newWidth = newHeight * resizeStartRef.current.aspectRatio;
        }
      }
      
      const roundedWidth = Math.round(newWidth);
      const roundedHeight = Math.round(newHeight);
      
      // Обновляем ref для использования в mouseup
      currentDimensionsRef.current = { width: roundedWidth, height: roundedHeight };
      
      setCurrentWidth(roundedWidth);
      setCurrentHeight(roundedHeight);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      
      // Сохраняем размеры из ref (актуальные значения)
      if (currentDimensionsRef.current) {
        const { width, height } = currentDimensionsRef.current;
        updateAttributes({ width, height });
      }
      
      resizeStartRef.current = null;
      currentDimensionsRef.current = null;
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [currentWidth, currentHeight, keepAspectRatio, updateAttributes]);

  // Start crop mode
  const startCrop = useCallback(() => {
    setIsCropping(true);
    setCropArea({ x: 10, y: 10, width: 80, height: 80 });
  }, []);

  // Handle crop area drag
  const handleCropMouseDown = useCallback((e: React.MouseEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsCropDragging(true);
    setCropDragType(type);
    cropStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      area: { ...cropArea },
    };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!cropStartRef.current || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const deltaX = ((moveEvent.clientX - cropStartRef.current.x) / containerRect.width) * 100;
      const deltaY = ((moveEvent.clientY - cropStartRef.current.y) / containerRect.height) * 100;
      
      const startArea = cropStartRef.current.area;
      let newArea = { ...startArea };
      
      if (type === 'move') {
        newArea.x = Math.max(0, Math.min(100 - newArea.width, startArea.x + deltaX));
        newArea.y = Math.max(0, Math.min(100 - newArea.height, startArea.y + deltaY));
      } else if (type === 'se') {
        // Southeast: expand right and down
        newArea.width = Math.max(10, Math.min(100 - startArea.x, startArea.width + deltaX));
        newArea.height = Math.max(10, Math.min(100 - startArea.y, startArea.height + deltaY));
      } else if (type === 'sw') {
        // Southwest: move left edge, expand down
        const newX = Math.max(0, Math.min(startArea.x + startArea.width - 10, startArea.x + deltaX));
        const newWidth = startArea.x + startArea.width - newX;
        newArea.x = newX;
        newArea.width = Math.max(10, newWidth);
        newArea.height = Math.max(10, Math.min(100 - startArea.y, startArea.height + deltaY));
      } else if (type === 'ne') {
        // Northeast: move top edge, expand right
        const newY = Math.max(0, Math.min(startArea.y + startArea.height - 10, startArea.y + deltaY));
        const newHeight = startArea.y + startArea.height - newY;
        newArea.y = newY;
        newArea.height = Math.max(10, newHeight);
        newArea.width = Math.max(10, Math.min(100 - startArea.x, startArea.width + deltaX));
      } else if (type === 'nw') {
        // Northwest: move both top and left edges
        const newX = Math.max(0, Math.min(startArea.x + startArea.width - 10, startArea.x + deltaX));
        const newY = Math.max(0, Math.min(startArea.y + startArea.height - 10, startArea.y + deltaY));
        const newWidth = startArea.x + startArea.width - newX;
        const newHeight = startArea.y + startArea.height - newY;
        newArea.x = newX;
        newArea.y = newY;
        newArea.width = Math.max(10, newWidth);
        newArea.height = Math.max(10, newHeight);
      }
      
      // Ensure crop area stays within bounds
      newArea.x = Math.max(0, Math.min(100 - 10, newArea.x));
      newArea.y = Math.max(0, Math.min(100 - 10, newArea.y));
      newArea.width = Math.max(10, Math.min(100 - newArea.x, newArea.width));
      newArea.height = Math.max(10, Math.min(100 - newArea.y, newArea.height));
      
      setCropArea(newArea);
    };
    
    const handleMouseUp = () => {
      setIsCropDragging(false);
      setCropDragType(null);
      cropStartRef.current = null;
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [cropArea]);

  // Apply crop
  const applyCrop = useCallback(async () => {
    if (!imageRef.current || !currentWidth || !currentHeight) return;
    
    const img = imageRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    // Calculate crop coordinates in natural image dimensions
    const cropX = (cropArea.x / 100) * naturalWidth;
    const cropY = (cropArea.y / 100) * naturalHeight;
    const cropW = (cropArea.width / 100) * naturalWidth;
    const cropH = (cropArea.height / 100) * naturalHeight;
    
    // Calculate new display dimensions proportionally
    const newDisplayWidth = (cropArea.width / 100) * currentWidth;
    const newDisplayHeight = (cropArea.height / 100) * currentHeight;
    
    // Create a new image with crossOrigin to handle CORS
    const loadImage = (imgSrc: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const newImg = new Image();
        newImg.crossOrigin = 'anonymous';
        newImg.onload = () => resolve(newImg);
        newImg.onerror = reject;
        newImg.src = imgSrc;
      });
    };
    
    try {
      // Try to load image with CORS
      let sourceImg: HTMLImageElement;
      try {
        sourceImg = await loadImage(src);
      } catch {
        // If CORS fails, use the original image reference (works for base64/same-origin)
        sourceImg = img;
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = cropW;
      canvas.height = cropH;
      
      ctx.drawImage(sourceImg, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      
      const croppedDataUrl = canvas.toDataURL('image/png');
      
      // Use proportional display dimensions, not natural cropped dimensions
      const finalWidth = Math.round(newDisplayWidth);
      const finalHeight = Math.round(newDisplayHeight);
      
      updateAttributes({ 
        src: croppedDataUrl,
        width: finalWidth,
        height: finalHeight,
      });
      
      setCurrentWidth(finalWidth);
      setCurrentHeight(finalHeight);
      setIsCropping(false);
    } catch (error) {
      console.error('Failed to crop image:', error);
      // Fallback: just update dimensions without cropping
      setIsCropping(false);
    }
  }, [cropArea, updateAttributes, src, currentWidth, currentHeight]);

  // Cancel crop
  const cancelCrop = useCallback(() => {
    setIsCropping(false);
    setCropArea({ x: 0, y: 0, width: 100, height: 100 });
  }, []);

  // Handle click on image to select it
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isCropping && editor && typeof getPos === 'function') {
      const pos = getPos();
      if (typeof pos === 'number') {
        editor.commands.setNodeSelection(pos);
      }
    }
  }, [editor, isCropping, getPos]);

  return (
    <NodeViewWrapper className="inline-block relative" data-drag-handle>
      <div 
        ref={containerRef}
        className={cn(
          "relative inline-block group",
          selected && "ring-2 ring-primary ring-offset-2",
          isResizing && "select-none"
        )}
        onClick={handleClick}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt || ''}
          onLoad={handleImageLoad}
          style={{
            width: currentWidth ? `${currentWidth}px` : 'auto',
            height: currentHeight ? `${currentHeight}px` : 'auto',
            maxWidth: '100%',
          }}
          className={cn(
            "rounded-md transition-opacity",
            isCropping && "opacity-50"
          )}
          draggable={false}
        />
        
        {/* Crop overlay */}
        {isCropping && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ 
              background: 'rgba(0,0,0,0.5)',
              clipPath: `polygon(
                0% 0%, 0% 100%, 
                ${cropArea.x}% 100%, ${cropArea.x}% ${cropArea.y}%, 
                ${cropArea.x + cropArea.width}% ${cropArea.y}%, 
                ${cropArea.x + cropArea.width}% ${cropArea.y + cropArea.height}%, 
                ${cropArea.x}% ${cropArea.y + cropArea.height}%, 
                ${cropArea.x}% 100%, 
                100% 100%, 100% 0%
              )`
            }}
          />
        )}
        
        {/* Crop selection box */}
        {isCropping && (
          <div
            className="absolute border-2 border-primary cursor-move"
            style={{
              left: `${cropArea.x}%`,
              top: `${cropArea.y}%`,
              width: `${cropArea.width}%`,
              height: `${cropArea.height}%`,
            }}
            onMouseDown={(e) => handleCropMouseDown(e, 'move')}
          >
            {/* Crop handles */}
            {['nw', 'ne', 'sw', 'se'].map((corner) => (
              <div
                key={corner}
                className={cn(
                  "absolute w-3 h-3 bg-primary rounded-full cursor-pointer",
                  corner.includes('n') ? '-top-1.5' : '-bottom-1.5',
                  corner.includes('w') ? '-left-1.5' : '-right-1.5'
                )}
                onMouseDown={(e) => handleCropMouseDown(e, corner)}
              />
            ))}
          </div>
        )}
        
        {/* Resize handles - show when selected and not cropping */}
        {selected && !isCropping && (
          <>
            {['nw', 'ne', 'sw', 'se'].map((corner) => (
              <div
                key={corner}
                className={cn(
                  "absolute w-3 h-3 bg-primary border-2 border-background rounded-sm cursor-pointer z-10",
                  corner === 'nw' && "-top-1.5 -left-1.5 cursor-nw-resize",
                  corner === 'ne' && "-top-1.5 -right-1.5 cursor-ne-resize",
                  corner === 'sw' && "-bottom-1.5 -left-1.5 cursor-sw-resize",
                  corner === 'se' && "-bottom-1.5 -right-1.5 cursor-se-resize"
                )}
                onMouseDown={(e) => handleResizeStart(e, corner)}
              />
            ))}
            
            {/* Side resize handles */}
            <div
              className="absolute top-1/2 -left-1.5 w-3 h-6 -translate-y-1/2 bg-primary border-2 border-background rounded-sm cursor-w-resize z-10"
              onMouseDown={(e) => handleResizeStart(e, 'w')}
            />
            <div
              className="absolute top-1/2 -right-1.5 w-3 h-6 -translate-y-1/2 bg-primary border-2 border-background rounded-sm cursor-e-resize z-10"
              onMouseDown={(e) => handleResizeStart(e, 'e')}
            />
            <div
              className="absolute -top-1.5 left-1/2 w-6 h-3 -translate-x-1/2 bg-primary border-2 border-background rounded-sm cursor-n-resize z-10"
              onMouseDown={(e) => handleResizeStart(e, 'n')}
            />
            <div
              className="absolute -bottom-1.5 left-1/2 w-6 h-3 -translate-x-1/2 bg-primary border-2 border-background rounded-sm cursor-s-resize z-10"
              onMouseDown={(e) => handleResizeStart(e, 's')}
            />
          </>
        )}
        
        {/* Toolbar */}
        {(showToolbar || isCropping) && (
          <div 
            className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-popover border rounded-md shadow-lg p-1 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {isCropping ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={applyCrop}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Применить
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={cancelCrop}
                >
                  <X className="h-4 w-4 mr-1" />
                  Отмена
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant={keepAspectRatio ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setKeepAspectRatio(!keepAspectRatio)}
                  title={keepAspectRatio ? "Пропорции сохраняются" : "Свободное изменение размера"}
                >
                  {keepAspectRatio ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Unlock className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={startCrop}
                  title="Обрезать"
                >
                  <Crop className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={deleteNode}
                  title="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
        
        {/* Dimensions display while resizing */}
        {isResizing && currentWidth && currentHeight && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {Math.round(currentWidth)} × {Math.round(currentHeight)}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
