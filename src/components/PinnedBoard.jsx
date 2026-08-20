import { useState, useRef, useEffect, useMemo } from 'react';
import { computeOptimalSinglePanelPacking } from '../utils/packing';
import { getImageSrc } from '../utils/image';
import { IconPin, IconStar, IconExpand, IconContract } from './icons';
import '../styles/pinnedBoard.css';

function PinnedBoard({
  items,
  onTogglePin,
  onToggleFavorite,
  onOpenPreview,
  onCloseBoard
}) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [aspectRatios, setAspectRatios] = useState({});

  // Measure container dimensions on resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Keyboard shortcut (Escape to exit expanded board)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseBoard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCloseBoard]);

  // Handle aspect ratio detection on image load
  const handleImageLoad = (id, e) => {
    const naturalWidth = e.target.naturalWidth;
    const naturalHeight = e.target.naturalHeight;
    if (naturalWidth && naturalHeight) {
      const ratio = naturalWidth / naturalHeight;
      setAspectRatios(prev => {
        if (prev[id] === ratio) return prev;
        return { ...prev, [id]: ratio };
      });
    }
  };

  // Merge items with their cached aspect ratios
  const itemsWithRatios = useMemo(() => {
    return items.map(item => ({
      ...item,
      aspectRatio: aspectRatios[item.id] || item.aspectRatio || 1.333
    }));
  }, [items, aspectRatios]);

  // Run the packing algorithm
  const layout = useMemo(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0 || itemsWithRatios.length === 0) {
      return { positions: [] };
    }
    return computeOptimalSinglePanelPacking(
      itemsWithRatios,
      dimensions.width,
      dimensions.height,
      14 // 14px gap
    );
  }, [itemsWithRatios, dimensions]);

  // Create a fast map of item positions by ID
  const positionMap = useMemo(() => {
    const map = new Map();
    for (const pos of layout.positions) {
      map.set(pos.id, pos);
    }
    return map;
  }, [layout]);

  return (
    <div className="pinned-board-container">
      {/* Top Header */}
      <div className="pinned-board-topbar">
        <div className="pinned-board-title-group">
          <span className="pinned-board-indicator"></span>
          <span className="pinned-board-title">PINNED FOCUS BOARD</span>
          <span className="pinned-board-counter">{items.length} {items.length === 1 ? 'reference' : 'references'}</span>
        </div>

        <div className="pinned-board-actions">
          <button
            type="button"
            className="collapse-board-btn"
            onClick={onCloseBoard}
            title="Collapse back to Gallery (Esc)"
          >
            <IconContract />
            <span>Collapse Board</span>
          </button>
        </div>
      </div>

      {/* Viewport Canvas with Optimally Packed Cards */}
      <div className="pinned-board-canvas" ref={containerRef}>
        {items.map((item, idx) => {
          const pos = positionMap.get(item.id);
          if (!pos) return null;

          return (
            <div
              key={item.id}
              className="packed-card"
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: `${pos.width}px`,
                height: `${pos.height}px`
              }}
              onClick={() => onOpenPreview(items, idx)}
            >
              {/* Context Actions */}
              <div className="card-actions">
                <div className="left-actions">
                  <button
                    type="button"
                    className="card-btn pin-btn pinned"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(item.id);
                    }}
                    title="Unpin from board"
                  >
                    <IconPin filled={true} />
                  </button>

                  <button
                    type="button"
                    className={`card-btn fav-btn ${item.isFavorite ? 'favorited' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(item.id);
                    }}
                    title={item.isFavorite ? "Remove favorite" : "Add to favorites"}
                  >
                    <IconStar filled={item.isFavorite} />
                  </button>
                </div>

                <div className="right-actions">
                  <button
                    type="button"
                    className="card-btn expand-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPreview(items, idx);
                    }}
                    title="Fullscreen Lightbox"
                  >
                    <IconExpand />
                  </button>
                </div>
              </div>

              {/* Image */}
              <img
                src={getImageSrc(item.path)}
                alt="Pinned Reference"
                onLoad={(e) => handleImageLoad(item.id, e)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PinnedBoard;
