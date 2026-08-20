import { useEffect } from 'react';
import { IconStar, IconPin, IconClose, IconChevronLeft, IconChevronRight } from './icons';
import { getImageSrc } from '../utils/image';
import '../styles/lightbox.css';

/**
 * Full-resolution preview modal. Owns its keyboard navigation
 * (Esc / arrows) and locks background scroll while mounted.
 */
export default function Lightbox({
  itemList,
  index,
  onClose,
  onNext,
  onPrev,
  onToggleFavorite,
  onTogglePin
}) {
  const item = itemList[index];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  // Lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-topbar" onClick={(e) => e.stopPropagation()}>
        <div className="preview-counter-pill">
          <span>{index + 1}</span>
          <span className="slash">/</span>
          <span>{itemList.length}</span>
        </div>

        <div className="preview-top-actions">
          {/* Star toggle */}
          <button
            type="button"
            className={`preview-action-btn ${item.isFavorite ? 'favorited' : ''}`}
            onClick={() => onToggleFavorite(item.id)}
            title="Favorite"
          >
            <IconStar filled={item.isFavorite} />
          </button>

          {/* Pin toggle */}
          <button
            type="button"
            className={`preview-action-btn ${item.isPinned ? 'pinned' : ''}`}
            onClick={() => onTogglePin(item.id)}
            title="Pin"
          >
            <IconPin filled={item.isPinned} />
          </button>

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

        <div className="preview-img-frame">
          <img
            key={index}
            src={getImageSrc(item.path)}
            alt="Expanded Preview"
            className="preview-img"
            draggable="false"
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

      <div className="preview-bottom-bar" onClick={(e) => e.stopPropagation()}>
        <div className="hint-pill">
          <kbd>←</kbd> <kbd>→</kbd> Navigate
        </div>
        <div className="hint-pill">
          <kbd>Esc</kbd> Dismiss
        </div>
        <div className="hint-pill">
          <kbd>⌘B</kbd> Sidebar
        </div>
      </div>
    </div>
  );
}
