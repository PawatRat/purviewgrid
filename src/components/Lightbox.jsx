import { useState, useEffect, useRef, useCallback } from 'react';
import {
  IconBoard,
  IconStar,
  IconPin,
  IconTag,
  IconClose,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconMinus
} from './icons';
import { getImageSrc } from '../utils/image';
import '../styles/lightbox.css';

/**
 * Full-resolution preview modal with interactive pan & zoom.
 * Supports wheel zoom, double-click toggle, drag pan, and keyboard controls.
 */
export default function Lightbox({
  itemList,
  index,
  onClose,
  onNext,
  onPrev,
  onToggleFavorite,
  onTogglePin,
  albums = [],
  boards = [],
  onToggleAlbum,
  onToggleBoard
}) {
  const item = itemList[index];

  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [assignmentMenu, setAssignmentMenu] = useState(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(null);

  // Reset zoom whenever image changes (React recommended pattern without effect)
  const [prevIndex, setPrevIndex] = useState(index);
  if (prevIndex !== index) {
    setPrevIndex(index);
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsDragging(false);
    setAssignmentMenu(null);
  }

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(8, Number((prev * 1.3).toFixed(2))));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => {
      const next = Math.max(1, Number((prev / 1.3).toFixed(2)));
      if (next === 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Keyboard navigation & zoom shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        onNext();
      } else if (e.key === 'ArrowLeft') {
        onPrev();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, zoomIn, zoomOut, resetZoom]);

  // Lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Wheel zoom handler on frame
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = -e.deltaY;
      const factor = e.ctrlKey ? 0.025 : 0.0018;

      setScale(prev => {
        const next = Math.min(8, Math.max(1, prev + delta * factor * prev));
        if (next === 1) {
          setTranslate({ x: 0, y: 0 });
        }
        return Number(next.toFixed(3));
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Mouse pan handlers
  const handleMouseDown = (e) => {
    if (scale <= 1 || e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - translate.x,
      y: e.clientY - translate.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setTranslate({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Double-click toggle (1x <-> 2.5x)
  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (scale > 1.05) {
      resetZoom();
    } else {
      setScale(2.5);
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetX = e.clientX - (rect.left + rect.width / 2);
      const offsetY = e.clientY - (rect.top + rect.height / 2);
      setTranslate({
        x: -offsetX * 1.5,
        y: -offsetY * 1.5
      });
    }
  };

  return (
    <div
      className="preview-overlay"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="preview-topbar" onClick={(e) => e.stopPropagation()}>
        {/* Left: Counter Pill */}
        <div className="preview-counter-pill">
          <span>{index + 1}</span>
          <span className="slash">/</span>
          <span>{itemList.length}</span>
        </div>

        {/* Center: Zoom Controls Pill */}
        <div className="preview-zoom-pill">
          <button
            type="button"
            className="preview-zoom-btn"
            onClick={zoomOut}
            disabled={scale <= 1}
            title="Zoom Out (-)"
          >
            <IconMinus />
          </button>
          <button
            type="button"
            className="preview-zoom-level"
            onClick={resetZoom}
            title="Reset Zoom (0)"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            className="preview-zoom-btn"
            onClick={zoomIn}
            disabled={scale >= 8}
            title="Zoom In (+)"
          >
            <IconPlus />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="preview-top-actions">
          {/* Star toggle */}
          <button
            type="button"
            className={`preview-action-btn ${item.isFavorite ? 'favorited' : ''}`}
            onClick={() => onToggleFavorite(item.id)}
            title={item.isFavorite ? 'Remove favorite' : 'Add to favorites'}
            aria-pressed={item.isFavorite}
          >
            <IconStar filled={item.isFavorite} />
          </button>

          {/* Pin toggle */}
          <button
            type="button"
            className={`preview-action-btn ${item.isPinned ? 'pinned' : ''}`}
            onClick={() => onTogglePin(item.id)}
            title={item.isPinned ? 'Unpin reference' : 'Pin reference'}
            aria-pressed={item.isPinned}
          >
            <IconPin filled={item.isPinned} />
          </button>

          <div className="preview-assign-wrap">
            <button
              type="button"
              className={`preview-action-btn ${boards.some(board => board.itemIds.includes(item.id)) ? 'assigned' : ''}`}
              onClick={() => setAssignmentMenu(current => current === 'boards' ? null : 'boards')}
              title="Add to Board"
            >
              <IconBoard />
            </button>
            {assignmentMenu === 'boards' && (
              <div className="preview-action-popover">
                <div className="album-popover-header">Add to Board</div>
                {boards.length === 0 ? <div className="album-popover-empty">No boards yet</div> : boards.map(board => {
                  const isAssigned = board.itemIds.includes(item.id);
                  return (
                    <button
                      key={board.id}
                      type="button"
                      className={`preview-assign-row ${isAssigned ? 'assigned' : ''}`}
                      onClick={() => {
                        onToggleBoard?.(item.id, board.id);
                        setAssignmentMenu(null);
                      }}
                    >
                      <span className="album-checkbox">{isAssigned ? '✓' : ''}</span>
                      <span className="album-popover-name">{board.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="preview-assign-wrap">
            <button
              type="button"
              className={`preview-action-btn ${(item.albumIds || []).length > 0 ? 'assigned' : ''}`}
              onClick={() => setAssignmentMenu(current => current === 'albums' ? null : 'albums')}
              title="Assign to Album"
            >
              <IconTag />
            </button>
            {assignmentMenu === 'albums' && (
              <div className="preview-action-popover">
                <div className="album-popover-header">Assign to Album</div>
                {albums.length === 0 ? <div className="album-popover-empty">No albums yet</div> : albums.map(album => {
                  const isAssigned = (item.albumIds || []).includes(album.id);
                  return (
                    <button
                      key={album.id}
                      type="button"
                      className={`preview-assign-row ${isAssigned ? 'assigned' : ''}`}
                      onClick={() => {
                        onToggleAlbum?.(item.id, album.id);
                        setAssignmentMenu(null);
                      }}
                    >
                      <span className="album-checkbox">{isAssigned ? '✓' : ''}</span>
                      <span className="album-popover-name">{album.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            type="button"
            className="preview-close-btn"
            onClick={onClose}
            title="Close preview (Esc)"
          >
            <IconClose />
          </button>
        </div>
      </div>

      {/* Main Preview Center Area */}
      <div className="preview-center" onClick={(e) => e.stopPropagation()}>
        {itemList.length > 1 && (
          <button
            type="button"
            className="preview-nav-btn prev"
            onClick={onPrev}
            title="Previous image (←)"
          >
            <IconChevronLeft />
          </button>
        )}

        <div
          ref={frameRef}
          className={`preview-img-frame ${scale > 1 ? 'is-zoomed' : ''} ${isDragging ? 'is-dragging' : ''}`}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          <img
            key={index}
            src={getImageSrc(item.path)}
            alt="Expanded Preview"
            className="preview-img"
            draggable="false"
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          />
        </div>

        {itemList.length > 1 && (
          <button
            type="button"
            className="preview-nav-btn next"
            onClick={onNext}
            title="Next image (→)"
          >
            <IconChevronRight />
          </button>
        )}
      </div>

      {/* Bottom Shortcuts / Hints Bar */}
      <div className="preview-bottom-bar" onClick={(e) => e.stopPropagation()}>
        <div className="hint-pill">
          <kbd>Scroll / +/-</kbd> Zoom
        </div>
        {scale > 1 && (
          <div className="hint-pill">
            <kbd>Drag</kbd> Pan
          </div>
        )}
        <div className="hint-pill">
          <kbd>0</kbd> Reset
        </div>
        <div className="hint-pill">
          <kbd>←</kbd> <kbd>→</kbd> Navigate
        </div>
        <div className="hint-pill">
          <kbd>Esc</kbd> Dismiss
        </div>
      </div>
    </div>
  );
}
