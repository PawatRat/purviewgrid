import { useState, useEffect, useRef, useCallback } from 'react';
import Masonry from 'react-masonry-css';
import './App.css';

// SVG Icons
const IconPin = ({ filled = false }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5M9 2h6l-1 7h3l-5 8-5-8h3l-1-7z" />
  </svg>
);

const IconStar = ({ filled = false }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconFolder = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const IconSidebar = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

const IconTag = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
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

const DEFAULT_ALBUMS = [
  { id: 'album-inspo', name: 'Inspirations' },
  { id: 'album-arch', name: 'Architecture' }
];

const INITIAL_ITEMS = SAMPLE_IMAGES.map((path, idx) => ({
  id: `img-${idx}`,
  path,
  addedAt: Date.now() - idx * 3600000,
  isPinned: idx < 2,
  isFavorite: idx === 0 || idx === 3 || idx === 6,
  albumIds: idx % 3 === 0 ? ['album-inspo'] : idx % 3 === 1 ? ['album-arch'] : []
}));

const getImageSrc = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  return `file://${path}`;
};

function App() {
  // Persistent State
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('purview_gallery_items');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_ITEMS;
  });

  const [albums, setAlbums] = useState(() => {
    try {
      const saved = localStorage.getItem('purview_gallery_albums');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_ALBUMS;
  });

  const [activeView, setActiveView] = useState('all'); // 'all', 'pinned', 'favorites', 'album-<id>'
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [columns, setColumns] = useState(4);
  const [isDeleteMode, setDeleteMode] = useState(false);
  const [previewData, setPreviewData] = useState(null); // { item, index, list }
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [activeAlbumMenuId, setActiveAlbumMenuId] = useState(null); // itemId for album tagging dropdown

  const scaleControlsRef = useRef(null);
  const wheelAccumulatorRef = useRef(0);

  // Ingestion Helper
  const addImagesToLibrary = useCallback((newPaths) => {
    setItems(prev => {
      const existingPaths = prev.map(i => i.path);
      const newItems = [];
      const currentAlbumId = activeView.startsWith('album-') ? activeView.replace('album-', '') : null;

      newPaths.forEach(p => {
        if (!existingPaths.includes(p)) {
          newItems.push({
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            path: p,
            addedAt: Date.now(),
            isPinned: false,
            isFavorite: false,
            albumIds: currentAlbumId ? [currentAlbumId] : []
          });
        }
      });
      return [...newItems, ...prev];
    });
  }, [activeView]);

  // Preview Navigation Helpers
  const openPreview = (itemList, index) => {
    setPreviewData({ itemList, index });
  };

  const closePreview = () => setPreviewData(null);

  const showNextPreview = () => {
    setPreviewData(prev => {
      if (!prev) return null;
      return { ...prev, index: (prev.index + 1) % prev.itemList.length };
    });
  };

  const showPrevPreview = () => {
    setPreviewData(prev => {
      if (!prev) return null;
      return { ...prev, index: (prev.index - 1 + prev.itemList.length) % prev.itemList.length };
    });
  };

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('purview_gallery_items', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save gallery items', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem('purview_gallery_albums', JSON.stringify(albums));
    } catch (e) {
      console.error('Failed to save albums', e);
    }
  }, [albums]);

  // IPC Ingestion
  useEffect(() => {
    const preventNav = (e) => e.preventDefault();
    window.addEventListener('dragover', preventNav);
    window.addEventListener('drop', preventNav);

    let cleanup = () => {};
    if (window.electronAPI) {
      cleanup = window.electronAPI.onOpenedFiles((files) => {
        const imageFiles = files.filter(f => /\.(png|jpe?g|gif|webp|bmp)$/i.test(f));
        if (imageFiles.length > 0) {
          addImagesToLibrary(imageFiles);
        }
      });
    }

    return () => {
      window.removeEventListener('dragover', preventNav);
      window.removeEventListener('drop', preventNav);
      cleanup();
    };
  }, [addImagesToLibrary]);

  // Scroll wheel on scale bar
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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
      if (previewData) {
        if (e.key === 'Escape') {
          setPreviewData(null);
        } else if (e.key === 'ArrowRight') {
          showNextPreview();
        } else if (e.key === 'ArrowLeft') {
          showPrevPreview();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewData]);

  // Window drag handlers
  const handleWindowDragOver = (e) => e.preventDefault();
  const handleWindowDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).map(f => f.path);
      const imageFiles = droppedFiles.filter(f => /\.(png|jpe?g|gif|webp|bmp)$/i.test(f));
      if (imageFiles.length > 0) {
        addImagesToLibrary(imageFiles);
      }
    }
  };

  // Item Action Handlers
  const togglePin = (id) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isPinned: !item.isPinned } : item));
  };

  const toggleFavorite = (id) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item));
  };

  const toggleAlbumForItem = (itemId, albumId) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const current = item.albumIds || [];
      const updated = current.includes(albumId) ? current.filter(a => a !== albumId) : [...current, albumId];
      return { ...item, albumIds: updated };
    }));
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Album Management
  const handleCreateAlbum = (e) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;
    const albumId = `album-${Date.now()}`;
    const newAlbum = { id: albumId, name: newAlbumName.trim() };
    setAlbums(prev => [...prev, newAlbum]);
    setNewAlbumName('');
    setIsCreatingAlbum(false);
    setActiveView(albumId);
  };

  const handleDeleteAlbum = (e, albumId) => {
    e.stopPropagation();
    setAlbums(prev => prev.filter(a => a.id !== albumId));
    setItems(prev => prev.map(item => ({
      ...item,
      albumIds: (item.albumIds || []).filter(a => a !== albumId)
    })));
    if (activeView === albumId) {
      setActiveView('all');
    }
  };

  const handleResetSampleGallery = () => {
    setItems(INITIAL_ITEMS);
    setAlbums(DEFAULT_ALBUMS);
    setActiveView('all');
  };

  // Filter items for current view
  const currentViewItems = items.filter(item => {
    if (activeView === 'all') return true;
    if (activeView === 'pinned') return item.isPinned;
    if (activeView === 'favorites') return item.isFavorite;
    if (activeView.startsWith('album-')) {
      const albumId = activeView.replace('album-', '');
      return item.albumIds && item.albumIds.includes(albumId);
    }
    return true;
  });

  const pinnedItems = currentViewItems.filter(item => item.isPinned);
  const unpinnedItems = currentViewItems.filter(item => !item.isPinned);

  // Statistics
  const totalCount = items.length;
  const pinnedCount = items.filter(i => i.isPinned).length;
  const favoritesCount = items.filter(i => i.isFavorite).length;

  const currentAlbum = albums.find(a => a.id === activeView);
  const currentViewTitle = activeView === 'all'
    ? 'All History'
    : activeView === 'pinned'
    ? 'Pinned References'
    : activeView === 'favorites'
    ? 'Favorites'
    : currentAlbum ? currentAlbum.name : 'Gallery';

  // Render Grid Helper
  const renderGrid = (itemList) => {
    if (itemList.length === 0) return null;
    return (
      <Masonry
        breakpointCols={columns}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        {itemList.map((item, idx) => (
          <div 
            key={item.id} 
            className={`image-card ${isDeleteMode ? 'in-delete-mode' : ''}`}
            onClick={() => {
              if (!isDeleteMode && activeAlbumMenuId === null) {
                openPreview(itemList, idx);
              }
            }}
          >
            {/* Action Bar */}
            <div className="card-actions">
              <div className="left-actions">
                <button 
                  type="button"
                  className={`card-btn pin-btn ${item.isPinned ? 'pinned' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(item.id);
                  }}
                  title={item.isPinned ? "Unpin reference" : "Pin reference"}
                >
                  <IconPin filled={item.isPinned} />
                </button>

                <button 
                  type="button"
                  className={`card-btn fav-btn ${item.isFavorite ? 'favorited' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.id);
                  }}
                  title={item.isFavorite ? "Remove favorite" : "Add to favorites"}
                >
                  <IconStar filled={item.isFavorite} />
                </button>
              </div>

              <div className="right-actions">
                {/* Album Assignment Tag Button */}
                <button 
                  type="button"
                  className="card-btn album-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveAlbumMenuId(activeAlbumMenuId === item.id ? null : item.id);
                  }}
                  title="Assign to Album"
                >
                  <IconTag />
                </button>

                {!isDeleteMode && (
                  <button 
                    type="button"
                    className="card-btn expand-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      openPreview(itemList, idx);
                    }}
                    title="Quick preview (Click)"
                  >
                    <IconExpand />
                  </button>
                )}

                {isDeleteMode && (
                  <button 
                    type="button"
                    className="card-btn delete-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(item.id);
                    }}
                    title="Remove item"
                  >
                    <IconTrash />
                  </button>
                )}
              </div>
            </div>

            {/* Album Assignment Popover */}
            {activeAlbumMenuId === item.id && (
              <div className="album-popover" onClick={(e) => e.stopPropagation()}>
                <div className="album-popover-header">Assign to Album</div>
                {albums.length === 0 ? (
                  <div className="album-popover-empty">No albums yet</div>
                ) : (
                  albums.map(alb => {
                    const isAssigned = (item.albumIds || []).includes(alb.id);
                    return (
                      <div 
                        key={alb.id} 
                        className={`album-popover-item ${isAssigned ? 'assigned' : ''}`}
                        onClick={() => toggleAlbumForItem(item.id, alb.id)}
                      >
                        <span className="album-checkbox">{isAssigned ? '✓' : ''}</span>
                        <span className="album-popover-name">{alb.name}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div className="img-container">
              <img src={getImageSrc(item.path)} alt="Gallery Item" loading="lazy" />
            </div>
          </div>
        ))}
      </Masonry>
    );
  };

  return (
    <div className="app-root" onClick={() => activeAlbumMenuId && setActiveAlbumMenuId(null)}>
      {/* Top Navbar */}
      <header className="top-navbar">
        {/* Left: Sidebar Toggle + Breadcrumb */}
        <div className="navbar-left">
          <button 
            type="button"
            className={`sidebar-toggle-btn ${isSidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            title="Toggle Navigation Sidebar (⌘B)"
          >
            <IconSidebar />
          </button>

          <div className="brand-group">
            <span className="brand-name">PURVIEW</span>
            <span className="breadcrumb-divider">/</span>
            <span className="breadcrumb-view">{currentViewTitle}</span>
          </div>

          <div className="item-count-badge">
            <span>{currentViewItems.length} {currentViewItems.length === 1 ? 'item' : 'items'}</span>
          </div>
        </div>

        {/* Right: Scale Stepper & Selection */}
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
        </div>
      </header>

      {/* Main Body with Sidebar + Canvas */}
      <div className="app-body">
        {/* Navigation Sidebar */}
        <aside className={`app-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-section">
            <div className="sidebar-section-title">LIBRARY</div>
            <button 
              type="button"
              className={`sidebar-nav-item ${activeView === 'all' ? 'active' : ''}`}
              onClick={() => setActiveView('all')}
            >
              <span className="sidebar-nav-icon"><IconClock /></span>
              <span className="sidebar-nav-label">All History</span>
              <span className="sidebar-nav-count">{totalCount}</span>
            </button>

            <button 
              type="button"
              className={`sidebar-nav-item ${activeView === 'pinned' ? 'active' : ''}`}
              onClick={() => setActiveView('pinned')}
            >
              <span className="sidebar-nav-icon gold"><IconPin filled /></span>
              <span className="sidebar-nav-label">Pinned</span>
              <span className="sidebar-nav-count">{pinnedCount}</span>
            </button>

            <button 
              type="button"
              className={`sidebar-nav-item ${activeView === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveView('favorites')}
            >
              <span className="sidebar-nav-icon yellow"><IconStar filled /></span>
              <span className="sidebar-nav-label">Favorites</span>
              <span className="sidebar-nav-count">{favoritesCount}</span>
            </button>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-title">ALBUMS</span>
              <button 
                type="button" 
                className="add-album-btn"
                onClick={() => setIsCreatingAlbum(true)}
                title="Create New Album"
              >
                <IconPlus />
              </button>
            </div>

            {isCreatingAlbum && (
              <form className="new-album-form" onSubmit={handleCreateAlbum}>
                <input 
                  type="text"
                  autoFocus
                  placeholder="Album name..."
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  onBlur={() => !newAlbumName.trim() && setIsCreatingAlbum(false)}
                />
              </form>
            )}

            <div className="albums-list">
              {albums.map(alb => {
                const count = items.filter(i => (i.albumIds || []).includes(alb.id)).length;
                return (
                  <div 
                    key={alb.id}
                    className={`sidebar-nav-item ${activeView === alb.id ? 'active' : ''}`}
                    onClick={() => setActiveView(alb.id)}
                  >
                    <span className="sidebar-nav-icon"><IconFolder /></span>
                    <span className="sidebar-nav-label">{alb.name}</span>
                    <span className="sidebar-nav-count">{count}</span>
                    <button 
                      type="button"
                      className="album-delete-btn"
                      onClick={(e) => handleDeleteAlbum(e, alb.id)}
                      title="Delete album"
                    >
                      <IconClose />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sidebar-footer">
            <button 
              type="button" 
              className="reset-demo-btn"
              onClick={handleResetSampleGallery}
              title="Reset sample photography library"
            >
              Reload Sample Gallery
            </button>
          </div>
        </aside>

        {/* Gallery Workspace Canvas */}
        <main 
          className="app-container" 
          onDragOver={handleWindowDragOver} 
          onDrop={handleWindowDrop}
        >
          {currentViewItems.length === 0 ? (
            <div className="empty-state-wrapper">
              <div className="empty-card">
                <div className="empty-icon-circle">
                  <IconGrid />
                </div>
                <h3>No images in {currentViewTitle}</h3>
                <p>Drag and drop images onto this window, or right-click images in Finder to open them in Purview.</p>
                <button 
                  type="button" 
                  className="load-demo-btn" 
                  onClick={handleResetSampleGallery}
                >
                  Load Sample Gallery
                </button>
              </div>
            </div>
          ) : (
            <div className="grids-container">
              {/* Show Pinned section when in 'all' view or album views if pinned items exist */}
              {activeView !== 'pinned' && pinnedItems.length > 0 && (
                <section className="section-block pinned-section">
                  <div className="section-header">
                    <div className="section-title-wrap">
                      <span className="section-dot pinned"></span>
                      <span className="section-label">PINNED REFERENCES</span>
                      <span className="section-pill">{pinnedItems.length}</span>
                    </div>
                  </div>
                  {renderGrid(pinnedItems)}
                </section>
              )}

              <section className="section-block gallery-section">
                {activeView !== 'pinned' && pinnedItems.length > 0 && (
                  <div className="section-header">
                    <div className="section-title-wrap">
                      <span className="section-dot"></span>
                      <span className="section-label">ALL ASSETS</span>
                      <span className="section-pill">{unpinnedItems.length}</span>
                    </div>
                  </div>
                )}
                {renderGrid(activeView === 'pinned' ? pinnedItems : unpinnedItems)}
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Studio Lightbox Preview Modal */}
      {previewData && (
        <div className="preview-overlay" onClick={closePreview}>
          <div className="preview-topbar" onClick={(e) => e.stopPropagation()}>
            <div className="preview-counter-pill">
              <span>{previewData.index + 1}</span>
              <span className="slash">/</span>
              <span>{previewData.itemList.length}</span>
            </div>

            <div className="preview-top-actions">
              {/* Star toggle */}
              <button 
                type="button"
                className={`preview-action-btn ${previewData.itemList[previewData.index].isFavorite ? 'favorited' : ''}`}
                onClick={() => toggleFavorite(previewData.itemList[previewData.index].id)}
                title="Favorite"
              >
                <IconStar filled={previewData.itemList[previewData.index].isFavorite} />
              </button>

              {/* Pin toggle */}
              <button 
                type="button"
                className={`preview-action-btn ${previewData.itemList[previewData.index].isPinned ? 'pinned' : ''}`}
                onClick={() => togglePin(previewData.itemList[previewData.index].id)}
                title="Pin"
              >
                <IconPin filled={previewData.itemList[previewData.index].isPinned} />
              </button>

              {/* Close button */}
              <button 
                type="button"
                className="preview-close-btn" 
                onClick={closePreview} 
                title="Close preview (Esc)"
              >
                <IconClose />
              </button>
            </div>
          </div>

          <div className="preview-center" onClick={(e) => e.stopPropagation()}>
            {previewData.itemList.length > 1 && (
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
                src={getImageSrc(previewData.itemList[previewData.index].path)} 
                alt="Expanded Preview" 
                className="preview-img" 
              />
            </div>

            {previewData.itemList.length > 1 && (
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
            <div className="hint-pill">
              <kbd>⌘B</kbd> Sidebar
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
