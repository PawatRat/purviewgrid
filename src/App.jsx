import { useState, useEffect, useRef } from 'react';
import Masonry from 'react-masonry-css';
import './App.css';

// SVG Icons
const IconPin = ({ filled = false }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5M9 2h6l-1 7h3l-5 8-5-8h3l-1-7z" />
  </svg>
);

const IconExpand = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconMinus = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconPlus = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconGrid = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const IconAppLogo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="18" rx="2" />
    <rect x="13" y="3" width="8" height="10" rx="2" />
    <rect x="13" y="15" width="8" height="6" rx="2" />
  </svg>
);

const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&auto=format&fit=crop&q=80'
];

const getImageSrc = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  return `file://${path}`;
};

function App() {
  const [images, setImages] = useState(SAMPLE_IMAGES.slice(2));
  const [pinnedImages, setPinnedImages] = useState([SAMPLE_IMAGES[0], SAMPLE_IMAGES[1]]);
  const [columns, setColumns] = useState(4);
  const [draggingItem, setDraggingItem] = useState(null);
  const [isDeleteMode, setDeleteMode] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const scaleControlsRef = useRef(null);
  const wheelAccumulatorRef = useRef(0);

  const openPreview = (imgList, index) => {
    setPreviewData({ imgList, index });
  };

  const closePreview = () => {
    setPreviewData(null);
  };

  const showNextPreview = () => {
    setPreviewData(prev => {
      if (!prev) return null;
      return { ...prev, index: (prev.index + 1) % prev.imgList.length };
    });
  };

  const showPrevPreview = () => {
    setPreviewData(prev => {
      if (!prev) return null;
      return { ...prev, index: (prev.index - 1 + prev.imgList.length) % prev.imgList.length };
    });
  };

  // Helper to check duplicates
  const isDuplicate = (f, currentImages, currentPinned) => currentImages.includes(f) || currentPinned.includes(f);

  // Setup OS file opening IPC callback and global drag prevention
  useEffect(() => {
    const preventNav = (e) => e.preventDefault();
    window.addEventListener('dragover', preventNav);
    window.addEventListener('drop', preventNav);

    let cleanup = () => {};
    if (window.electronAPI) {
      cleanup = window.electronAPI.onOpenedFiles((files) => {
        const imageFiles = files.filter(f => /\.(png|jpe?g|gif|webp|bmp)$/i.test(f));
        setImages(prev => {
          const newImages = [...prev];
          imageFiles.forEach(f => {
            if (!newImages.includes(f) && !pinnedImages.includes(f)) newImages.push(f);
          });
          return newImages;
        });
      });
    }

    return () => {
      window.removeEventListener('dragover', preventNav);
      window.removeEventListener('drop', preventNav);
      cleanup();
    };
  }, [pinnedImages]);

  // Scroll wheel handler on scale controls to slide/adjust grid columns
  useEffect(() => {
    const el = scaleControlsRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY !== 0 ? -e.deltaY : e.deltaX;
      wheelAccumulatorRef.current += delta;

      const THRESHOLD = 35;
      if (wheelAccumulatorRef.current >= THRESHOLD) {
        const steps = Math.floor(wheelAccumulatorRef.current / THRESHOLD);
        setColumns(prev => Math.min(12, prev + steps));
        wheelAccumulatorRef.current = wheelAccumulatorRef.current % THRESHOLD;
      } else if (wheelAccumulatorRef.current <= -THRESHOLD) {
        const steps = Math.floor(Math.abs(wheelAccumulatorRef.current) / THRESHOLD);
        setColumns(prev => Math.max(1, prev - steps));
        wheelAccumulatorRef.current = wheelAccumulatorRef.current % THRESHOLD;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Keyboard navigation for image preview lightbox
  useEffect(() => {
    if (!previewData) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPreviewData(null);
      } else if (e.key === 'ArrowRight') {
        showNextPreview();
      } else if (e.key === 'ArrowLeft') {
        showPrevPreview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewData]);

  // Window drag handlers (for adding new files)
  const handleWindowDragOver = (e) => {
    e.preventDefault();
  };

  const handleWindowDrop = (e) => {
    e.preventDefault();
    if (draggingItem !== null) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).map(f => f.path);
      const imageFiles = droppedFiles.filter(f => /\.(png|jpe?g|gif|webp|bmp)$/i.test(f));
      
      setImages(prev => {
        const newImages = [...prev];
        imageFiles.forEach(f => {
          if (!isDuplicate(f, newImages, pinnedImages)) newImages.push(f);
        });
        return newImages;
      });
    }
  };

  // Internal Item drag handlers (reordering)
  const handleItemDragStart = (e, index, type) => {
    e.stopPropagation();
    setDraggingItem({ type, index });
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleItemDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggingItem(null);
  };

  const handleItemDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  };

  const handleItemDrop = (e, dropIndex, dropType) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingItem) return;
    
    if (draggingItem.type !== dropType) return;
    if (draggingItem.index === dropIndex) return;

    if (dropType === 'pinned') {
      setPinnedImages(prev => {
        const newArr = [...prev];
        const [movedItem] = newArr.splice(draggingItem.index, 1);
        newArr.splice(dropIndex, 0, movedItem);
        return newArr;
      });
    } else {
      setImages(prev => {
        const newArr = [...prev];
        const [movedItem] = newArr.splice(draggingItem.index, 1);
        newArr.splice(dropIndex, 0, movedItem);
        return newArr;
      });
    }
    setDraggingItem(null);
  };

  const handleRemoveImage = (e, indexToRemove, type) => {
    e.stopPropagation();
    if (type === 'pinned') {
      setPinnedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    } else {
      setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    }
  };

  const togglePin = (e, imgPath, currentType) => {
    e.stopPropagation();
    if (currentType === 'unpinned') {
      setImages(prev => prev.filter(p => p !== imgPath));
      setPinnedImages(prev => [imgPath, ...prev]);
    } else {
      setPinnedImages(prev => prev.filter(p => p !== imgPath));
      setImages(prev => [imgPath, ...prev]);
    }
  };

  const handleLoadSamples = () => {
    setPinnedImages([SAMPLE_IMAGES[0], SAMPLE_IMAGES[1]]);
    setImages(SAMPLE_IMAGES.slice(2));
  };

  const renderGrid = (imgList, type) => {
    if (imgList.length === 0) return null;
    return (
      <Masonry
        breakpointCols={columns}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        {imgList.map((img, idx) => (
          <div 
            key={`${img}-${idx}`} 
            className={`image-card ${isDeleteMode ? 'in-delete-mode' : ''}`}
            draggable={!isDeleteMode}
            onDragStart={(e) => !isDeleteMode && handleItemDragStart(e, idx, type)}
            onDragEnd={!isDeleteMode ? handleItemDragEnd : undefined}
            onDragOver={!isDeleteMode ? handleItemDragOver : undefined}
            onDrop={(e) => !isDeleteMode && handleItemDrop(e, idx, type)}
            onClick={() => {
              if (!isDeleteMode && draggingItem === null) {
                openPreview(imgList, idx);
              }
            }}
          >
            {/* Action Bar */}
            <div className="card-actions">
              <button 
                type="button"
                className={`card-btn pin-btn ${type === 'pinned' ? 'pinned' : ''}`}
                onClick={(e) => togglePin(e, img, type)}
                title={type === 'pinned' ? "Unpin from top" : "Pin to top"}
              >
                <IconPin filled={type === 'pinned'} />
              </button>

              <div className="right-actions">
                {!isDeleteMode && (
                  <button 
                    type="button"
                    className="card-btn expand-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      openPreview(imgList, idx);
                    }}
                    title="Quick preview"
                  >
                    <IconExpand />
                  </button>
                )}
                {isDeleteMode && (
                  <button 
                    type="button"
                    className="card-btn delete-btn" 
                    onClick={(e) => handleRemoveImage(e, idx, type)}
                    title="Remove item"
                  >
                    <IconTrash />
                  </button>
                )}
              </div>
            </div>

            <div className="img-container">
              <img src={getImageSrc(img)} alt={`asset-${idx}`} loading="lazy" />
            </div>
          </div>
        ))}
      </Masonry>
    );
  };

  const totalItems = images.length + pinnedImages.length;

  return (
    <>
      {/* Sleek Native MacOS Top Navbar */}
      <header className="top-navbar">
        {/* Left: App Branding & Status */}
        <div className="navbar-left">
          <div className="brand-group">
            <span className="brand-icon"><IconAppLogo /></span>
            <span className="brand-name">PURVIEW</span>
          </div>
          {totalItems > 0 && (
            <div className="item-count-badge">
              <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
              {pinnedImages.length > 0 && (
                <span className="pinned-count-tag">· {pinnedImages.length} pinned</span>
              )}
            </div>
          )}
        </div>

        {/* Right: Scale Controller & Actions */}
        <div className="controls-bar no-drag" ref={scaleControlsRef}>
          <div className="scale-stepper">
            <button 
              type="button"
              className="stepper-btn" 
              onClick={() => setColumns(prev => Math.max(1, prev - 1))}
              disabled={columns <= 1}
              title="Decrease column count"
            >
              <IconMinus />
            </button>
            <div className="scale-slider-track">
              <input 
                id="scale-slider"
                type="range" 
                min="1" 
                max="12" 
                value={columns} 
                onChange={(e) => setColumns(Number(e.target.value))}
                title={`Grid scale: ${columns} columns (Scroll on bar to adjust)`}
              />
            </div>
            <button 
              type="button"
              className="stepper-btn" 
              onClick={() => setColumns(prev => Math.min(12, prev + 1))}
              disabled={columns >= 12}
              title="Increase column count"
            >
              <IconPlus />
            </button>
            <span className="columns-indicator">{columns} cols</span>
          </div>

          <button 
            type="button"
            className={`action-pill-btn ${isDeleteMode ? 'active' : ''}`}
            onClick={() => setDeleteMode(!isDeleteMode)}
          >
            {isDeleteMode ? 'Done' : 'Select'}
          </button>

          {totalItems === 0 && (
            <button 
              type="button"
              className="action-pill-btn accent"
              onClick={handleLoadSamples}
            >
              Load Demo
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Container */}
      <main 
        className="app-container" 
        onDragOver={handleWindowDragOver} 
        onDrop={handleWindowDrop}
      >
        {totalItems === 0 ? (
          <div className="empty-state-wrapper">
            <div className="empty-card">
              <div className="empty-icon-circle">
                <IconGrid />
              </div>
              <h3>Workspace is empty</h3>
              <p>Drag and drop images onto this window, or right-click image files in Finder and choose <strong>Open With → Purview</strong>.</p>
              <button 
                type="button" 
                className="load-demo-btn" 
                onClick={handleLoadSamples}
              >
                Load Demo Gallery
              </button>
            </div>
          </div>
        ) : (
          <div className="grids-container">
            {pinnedImages.length > 0 && (
              <section className="section-block pinned-section">
                <div className="section-header">
                  <div className="section-title-wrap">
                    <span className="section-dot pinned"></span>
                    <span className="section-label">PINNED REFERENCES</span>
                    <span className="section-pill">{pinnedImages.length}</span>
                  </div>
                </div>
                {renderGrid(pinnedImages, 'pinned')}
              </section>
            )}

            <section className="section-block gallery-section">
              {pinnedImages.length > 0 && (
                <div className="section-header">
                  <div className="section-title-wrap">
                    <span className="section-dot"></span>
                    <span className="section-label">ALL ASSETS</span>
                    <span className="section-pill">{images.length}</span>
                  </div>
                </div>
              )}
              {renderGrid(images, 'unpinned')}
            </section>
          </div>
        )}

        {/* Professional Lightbox Preview Modal */}
        {previewData && (
          <div className="preview-overlay" onClick={closePreview}>
            <div className="preview-topbar" onClick={(e) => e.stopPropagation()}>
              <div className="preview-counter-pill">
                <span>{previewData.index + 1}</span>
                <span className="slash">/</span>
                <span>{previewData.imgList.length}</span>
              </div>
              <button 
                type="button"
                className="preview-close-btn" 
                onClick={closePreview} 
                title="Close preview (Esc)"
              >
                <IconClose />
              </button>
            </div>

            <div className="preview-center" onClick={(e) => e.stopPropagation()}>
              {previewData.imgList.length > 1 && (
                <button 
                  type="button"
                  className="preview-nav-btn prev" 
                  onClick={showPrevPreview} 
                  title="Previous image (←)"
                >
                  <IconChevronLeft />
                </button>
              )}

              <div className="preview-img-frame">
                <img 
                  src={getImageSrc(previewData.imgList[previewData.index])} 
                  alt="Expanded Preview" 
                  className="preview-img" 
                />
              </div>

              {previewData.imgList.length > 1 && (
                <button 
                  type="button"
                  className="preview-nav-btn next" 
                  onClick={showNextPreview} 
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
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default App;
