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
  IconMinus,
  IconExternal
} from './icons';
import { getImageSrc } from '../utils/image';
import '../styles/lightbox.css';

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'Unavailable';
  if (bytes === 0) return '0 bytes';
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / (1024 ** unitIndex);
  return `${value.toFixed(unitIndex === 0 ? 0 : value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function formatDate(timestamp) {
  if (!timestamp) return 'Unavailable';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function formatMetadataValue(value) {
  if (value === null || value === undefined || value === '') return 'Unavailable';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : Number(value.toFixed(4)).toString();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDate(value);
  return String(value);
}

function humanizeMetadataKey(key) {
  return key
    .split('.').at(-1)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^GPS/, 'GPS ')
    .replace(/^ISO$/, 'ISO');
}

function MetadataRow({ label, value, title }) {
  return (
    <div className="inspector-row">
      <span className="inspector-row-label">{label}</span>
      <span className="inspector-row-value" title={title || String(value ?? '')}>{formatMetadataValue(value)}</span>
    </div>
  );
}

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
  onToggleBoard,
  libraryItems = [],
  onOpenRelated
}) {
  const item = itemList[index];

  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [assignmentMenu, setAssignmentMenu] = useState(null);
  const [inspectionState, setInspection] = useState({ itemKey: null, status: 'loading', metadata: null, exif: {}, related: [] });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(null);
  const libraryItemsRef = useRef(libraryItems);
  const inspectionKey = `${item.id}:${item.path}:${item.modifiedAt || item.size || ''}`;
  const inspection = inspectionState.itemKey === inspectionKey
    ? inspectionState
    : {
        itemKey: inspectionKey,
        status: window.electronAPI?.inspectImage ? 'loading' : 'unsupported',
        metadata: null,
        exif: {},
        related: []
      };

  useEffect(() => {
    libraryItemsRef.current = libraryItems;
  }, [libraryItems]);

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

  useEffect(() => {
    let cancelled = false;
    const inspect = window.electronAPI?.inspectImage;
    if (!inspect) return undefined;

    const candidates = libraryItemsRef.current.map(candidate => ({
      id: candidate.id,
      path: candidate.path,
      size: candidate.size,
      modifiedAt: candidate.modifiedAt,
      aspectRatio: candidate.aspectRatio
    }));
    inspect({
      id: item.id,
      path: item.path,
      size: item.size,
      modifiedAt: item.modifiedAt,
      aspectRatio: item.aspectRatio
    }, candidates).then(result => {
      if (!cancelled) setInspection({ ...result, itemKey: inspectionKey });
    }).catch(error => {
      if (!cancelled) {
        setInspection({ itemKey: inspectionKey, status: 'error', metadata: null, exif: {}, related: [], error: error?.message || 'Inspection failed.' });
      }
    });
    return () => { cancelled = true; };
  }, [inspectionKey, item.aspectRatio, item.id, item.modifiedAt, item.path, item.size]);

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
      <div className="preview-center has-inspector" onClick={(e) => e.stopPropagation()}>
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
            src={getImageSrc(item.path, item.modifiedAt)}
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

      <aside className="preview-inspector" onClick={(e) => e.stopPropagation()}>
        <div className="inspector-scroll">
          <header className="inspector-header">
            <div className="inspector-eyebrow">IMAGE INSPECTOR</div>
            <h2 title={inspection.metadata?.fileName || item.path}>
              {inspection.metadata?.fileName || item.path.split('/').pop() || 'Image'}
            </h2>
            <div className="inspector-source-row">
              <span title={inspection.metadata?.folder || item.path}>{inspection.metadata?.folder || item.path}</span>
              {!/^(https?:|data:|blob:)/i.test(item.path) && (
                <button type="button" onClick={() => window.electronAPI?.showInFolder?.(item.path)} title="Reveal in Finder">
                  <IconExternal />
                </button>
              )}
            </div>
          </header>

          <section className="inspector-section">
            <div className="inspector-section-title">FILE</div>
            <div className="inspector-table">
              <MetadataRow label="Size" value={inspection.metadata ? formatBytes(inspection.metadata.size) : formatBytes(item.size)} />
              <MetadataRow label="Type" value={inspection.metadata?.mediaType || inspection.metadata?.extension || 'Unavailable'} />
              <MetadataRow label="Created" value={formatDate(inspection.metadata?.createdAt || item.createdAt)} />
              <MetadataRow label="Modified" value={formatDate(inspection.metadata?.modifiedAt || item.modifiedAt)} />
              <MetadataRow label="Fingerprint" value={item.hash ? item.hash.slice(-16) : 'Unavailable'} title={item.hash} />
            </div>
          </section>

          <section className="inspector-section">
            <div className="inspector-section-title">IMAGE</div>
            <div className="inspector-table">
              <MetadataRow label="Dimensions" value={inspection.metadata?.width && inspection.metadata?.height ? `${inspection.metadata.width} × ${inspection.metadata.height} px` : 'Unavailable'} />
              <MetadataRow label="Megapixels" value={inspection.metadata?.width && inspection.metadata?.height ? `${((inspection.metadata.width * inspection.metadata.height) / 1000000).toFixed(2)} MP` : 'Unavailable'} />
              <MetadataRow label="Aspect ratio" value={inspection.metadata?.width && inspection.metadata?.height ? (inspection.metadata.width / inspection.metadata.height).toFixed(3) : item.aspectRatio} />
              <MetadataRow label="Color space" value={inspection.metadata?.space?.toUpperCase()} />
              <MetadataRow label="Channels" value={inspection.metadata?.channels} />
              <MetadataRow label="Bit depth" value={inspection.metadata?.bitsPerSample ? `${inspection.metadata.bitsPerSample}-bit` : inspection.metadata?.depth} />
              <MetadataRow label="Density" value={inspection.metadata?.density ? `${inspection.metadata.density} DPI` : null} />
              <MetadataRow label="Alpha" value={inspection.metadata?.hasAlpha} />
              <MetadataRow label="Progressive" value={inspection.metadata?.isProgressive} />
              {inspection.metadata?.dominantColor && (
                <div className="inspector-row">
                  <span className="inspector-row-label">Average color</span>
                  <span className="inspector-color-value">
                    <i style={{ background: inspection.metadata.dominantColor }} />
                    {inspection.metadata.dominantColor.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </section>

          {Object.keys(inspection.exif || {}).length > 0 && (
            <section className="inspector-section">
              <div className="inspector-section-title">CAPTURE &amp; CAMERA</div>
              <div className="inspector-table">
                {Object.entries(inspection.exif).map(([key, value]) => (
                  <MetadataRow key={key} label={humanizeMetadataKey(key)} value={value} />
                ))}
              </div>
            </section>
          )}

          <section className="inspector-section">
            <div className="inspector-section-title">ORGANIZATION</div>
            <div className="inspector-table">
              <MetadataRow label="Albums" value={albums.filter(album => (item.albumIds || []).includes(album.id)).map(album => album.name).join(', ') || 'None'} />
              <MetadataRow label="Boards" value={boards.filter(board => board.itemIds.includes(item.id)).map(board => board.name).join(', ') || 'None'} />
              <MetadataRow label="Pinned" value={item.isPinned} />
              <MetadataRow label="Favorite" value={item.isFavorite} />
              <MetadataRow label="Copies" value={(item.duplicatePaths || [item.path]).length} />
            </div>
            {(item.duplicatePaths || []).length > 1 && (
              <div className="inspector-path-list">
                {item.duplicatePaths.map(duplicatePath => (
                  <button type="button" key={duplicatePath} onClick={() => window.electronAPI?.showInFolder?.(duplicatePath)} title={duplicatePath}>
                    <span>{duplicatePath.split('/').pop()}</span>
                    <IconExternal />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="inspector-section related-section">
            <div className="inspector-section-heading">
              <div className="inspector-section-title">RELATED IMAGES</div>
              {inspection.status === 'ready' && (
                <span>{inspection.indexedCount}/{inspection.candidateCount}</span>
              )}
            </div>
            {inspection.status === 'loading' && (
              <div className="inspector-analysis-state"><i />Analyzing visual similarity…</div>
            )}
            {inspection.status === 'remote' && (
              <div className="inspector-empty">Related-image analysis is available for local files.</div>
            )}
            {inspection.status === 'error' && (
              <div className="inspector-empty">{inspection.error}</div>
            )}
            {inspection.status === 'ready' && inspection.related.length === 0 && (
              <div className="inspector-empty">No related local images indexed yet.</div>
            )}
            {inspection.related?.length > 0 && (
              <div className="related-grid">
                {inspection.related.map(relation => {
                  const relatedItem = libraryItems.find(candidate => candidate.id === relation.id || candidate.path === relation.path);
                  if (!relatedItem) return null;
                  return (
                    <button type="button" key={relation.path} onClick={() => onOpenRelated?.(relatedItem)} title={`${Math.round(relation.score * 100)}% visually similar`}>
                      <img src={getImageSrc(relatedItem.path, relatedItem.modifiedAt)} alt="Related" loading="lazy" />
                      <span>{Math.round(relation.score * 100)}%</span>
                    </button>
                  );
                })}
              </div>
            )}
            {inspection.isPartial && (
              <div className="inspector-index-note">More fingerprints will be cached as images are inspected.</div>
            )}
          </section>
        </div>
      </aside>

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
