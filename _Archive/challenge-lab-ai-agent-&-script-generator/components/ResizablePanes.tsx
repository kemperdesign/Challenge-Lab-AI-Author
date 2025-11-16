
import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizablePanesProps {
  topContent: React.ReactNode;
  bottomContent: React.ReactNode;
}

const MIN_HEIGHT = 100; // Minimum height in pixels for each pane

export const ResizablePanes: React.FC<ResizablePanesProps> = ({ topContent, bottomContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [topPaneHeight, setTopPaneHeight] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    const topPane = containerRef.current?.children[0] as HTMLDivElement;
    if (topPane) {
      startHeightRef.current = topPane.offsetHeight;
    }
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;

    const deltaY = e.clientY - startYRef.current;
    const newHeight = startHeightRef.current + deltaY;
    
    const containerHeight = containerRef.current.offsetHeight;
    const dividerHeight = (containerRef.current.children[1] as HTMLDivElement).offsetHeight;

    const maxHeight = containerHeight - MIN_HEIGHT - dividerHeight;

    const clampedHeight = Math.max(MIN_HEIGHT, Math.min(newHeight, maxHeight));
    
    setTopPaneHeight(clampedHeight);
  }, []);

  useEffect(() => {
    // Set initial height
    if (containerRef.current && topPaneHeight === null) {
      setTopPaneHeight(containerRef.current.offsetHeight / 2.2);
    }
  }, [topPaneHeight]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  const topStyle = topPaneHeight !== null ? { height: `${topPaneHeight}px` } : { flex: 1 };

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full">
      <div className="min-h-0" style={topStyle}>
        {topContent}
      </div>
      <div
        onMouseDown={handleMouseDown}
        className="h-2 bg-dark-border cursor-row-resize hover:bg-brand-primary/50 transition-colors duration-200 flex-shrink-0"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panels"
      />
      <div className="flex-1 min-h-0">
        {bottomContent}
      </div>
    </div>
  );
};
