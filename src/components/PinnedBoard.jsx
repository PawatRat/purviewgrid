import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { computeOptimalSinglePanelPacking } from '../utils/packing';
import { getImageSrc } from '../utils/image';
import { IconPin, IconStar, IconExpand, IconContract, IconClose } from './icons';
import '../styles/pinnedBoard.css';

function PinnedBoard({
  items,
  onTogglePin,
  onToggleFavorite,
  onOpenPreview,
  onCloseBoard,
  onReorder,
  title = 'Pinned Focus Board',
  showHeader = true,
  isCustomBoard = false,
  onRemoveItem
}) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [aspectRatios, setAspectRatios] = useState({});

  // Local ordered list of items for fluid live drag-reordering
  const [prevItems, setPrevItems] = useState(items);
  const [orderedItems, setOrderedItems] = useState(items);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const wasDraggingRef = useRef(false);

  // Sync ordered items when parent items change without effect
  if (prevItems !== items) {
    setPrevItems(items);
    const incomingMap = new Map(items.map(i => [i.id, i]));
    const preserved = orderedItems.filter(i => incomingMap.has(i.id)).map(i => incomingMap.get(i.id));
    const existingSet = new Set(preserved.map(i => i.id));
    const newlyAdded = items.filter(i => !existingSet.has(i.id));
    setOrderedItems([...preserved, ...newlyAdded]);
  }

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
    return orderedItems.map(item => ({
      ...item,
      aspectRatio: aspectRatios[item.id] || item.aspectRatio || 1.333
    }));
  }, [orderedItems, aspectRatios]);

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

  // Drag and drop handlers for smart reordering
  const handleDragStart = (e, item) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    setDraggedId(item.id);
    wasDraggingRef.current = true;
  };

  const handleDragOver = useCallback((e, targetItem) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedId || draggedId === targetItem.id) return;

    setDragOverId(targetItem.id);

    // Live reorder so user sees the smart packing update in real-time
    setOrderedItems(prev => {
      const fromIndex = prev.findIndex(i => i.id === draggedId);
      const toIndex = prev.findIndex(i => i.id === targetItem.id);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, [draggedId]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
    if (onReorder) {
      onReorder(orderedItems);
    }
    setTimeout(() => {
      wasDraggingRef.current = false;
    }, 80);
  }, [orderedItems, onReorder]);

  const handleCardClick = (idx) => {
    if (wasDraggingRef.current) return;
    onOpenPreview(orderedItems, idx);
  };

  return (
    <div className="pinned-board-container">
      {showHeader && <div className="pinned-board-topbar">
        <div className="pinned-board-title-group">
          <span className="pinned-board-indicator"></span>
          <span className="pinned-board-title">{title.toUpperCase()}</span>
          <span className="pinned-board-counter">{orderedItems.length} {orderedItems.length === 1 ? 'reference' : 'references'}</span>
          <span className="pinned-board-drag-hint">Drag images to reorder layout</span>
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
      </div>}

      {/* Viewport Canvas with Optimally Packed Cards */}
      <div className="pinned-board-canvas" ref={containerRef}>
        {orderedItems.map((item, idx) => {
          const pos = positionMap.get(item.id);
          if (!pos) return null;

          const isCurrentlyDragged = draggedId === item.id;
          const isCurrentlyDragOver = dragOverId === item.id;

          return (
            <div
              key={item.id}
              className={`packed-card ${isCurrentlyDragged ? 'is-dragging' : ''} ${isCurrentlyDragOver ? 'is-drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragOver={(e) => handleDragOver(e, item)}
              onDragEnd={handleDragEnd}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: `${pos.width}px`,
                height: `${pos.height}px`
              }}
              onClick={() => handleCardClick(idx)}
            >
              {/* Subtle contrast gradient on hover */}
              <div className="card-scrim" />

              {/* Context Actions */}
              <div className="card-actions" draggable={false} onDragStart={(e) => e.stopPropagation()}>
                <div className="left-actions">
                  <button
                    type="button"
                    className="card-btn pin-btn pinned"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCustomBoard) onRemoveItem(item.id);
                      else onTogglePin(item.id);
                    }}
                    title={isCustomBoard ? 'Remove from board' : 'Unpin from board'}
                  >
                    {isCustomBoard ? <IconClose /> : <IconPin filled={true} />}
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
                      onOpenPreview(orderedItems, idx);
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
                draggable={false}
                onLoad={(e) => handleImageLoad(item.id, e)}
              />
            </div>
          );
        })}
        {orderedItems.length === 0 && (
          <div className="pinned-board-empty">
            <IconBoardEmpty />
            <span>Add images from any Library view using the board button.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function IconBoardEmpty() {
  return <span className="pinned-board-empty-mark">+</span>;
}

export default PinnedBoard;
