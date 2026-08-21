import { useState, useEffect, useRef, useCallback } from 'react';
import TopNavbar from './components/TopNavbar';
import Sidebar from './components/Sidebar';
import MasonryGrid from './components/MasonryGrid';
import EmptyState from './components/EmptyState';
import Lightbox from './components/Lightbox';
import PinnedBoard from './components/PinnedBoard';
import { IconExpand } from './components/icons';
import { usePersistentState } from './hooks/usePersistentState';
import { INITIAL_ITEMS, DEFAULT_ALBUMS } from './data/sampleData';
import './styles/gallery.css';

function App() {
  // Persistent State
  const [items, setItems] = usePersistentState('purview_gallery_items', INITIAL_ITEMS);
  const [albums, setAlbums] = usePersistentState('purview_gallery_albums', DEFAULT_ALBUMS);

  // UI State
  const [activeView, setActiveView] = useState('all'); // 'all', 'pinned', 'favorites', 'album-<id>'
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isPinnedExpanded, setPinnedExpanded] = useState(false);
  const [columns, setColumns] = useState(4);
  const [isSelectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewData, setPreviewData] = useState(null); // { itemList, index }
  const [activeAlbumMenuId, setActiveAlbumMenuId] = useState(null); // itemId for album tagging dropdown

  const scaleControlsRef = useRef(null);
  const wheelAccumulatorRef = useRef(0);

  const addImagesToLibrary = useCallback((newPaths) => {
    setItems(prev => {
      const existingPaths = prev.map(i => i.path);
      const newItems = [];
      const currentAlbumId = activeView.startsWith('album-') ? activeView : null;

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
  }, [activeView, setItems]);

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
      } else if (e.key === 'Escape' && isSelectMode) {
        setSelectMode(false);
        setSelectedIds(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectMode]);

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

  // Preview Navigation
  const openPreview = (itemList, index) => {
    setPreviewData({ itemList, index });
  };

  const closePreview = useCallback(() => setPreviewData(null), []);

  const showNextPreview = useCallback(() => {
    setPreviewData(prev => {
      if (!prev) return null;
      return { ...prev, index: (prev.index + 1) % prev.itemList.length };
    });
  }, []);

  const showPrevPreview = useCallback(() => {
    setPreviewData(prev => {
      if (!prev) return null;
      return { ...prev, index: (prev.index - 1 + prev.itemList.length) % prev.itemList.length };
    });
  }, []);

  // Item Action Handlers
  const togglePin = useCallback((id) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isPinned: !item.isPinned } : item));
  }, [setItems]);

  const toggleFavorite = useCallback((id) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item));
  }, [setItems]);

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
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Selection Handlers
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(prev => {
      const next = !prev;
      if (!next) {
        setSelectedIds(new Set());
      }
      return next;
    });
  }, []);

  const handleToggleAlbumMenu = (itemId) => {
    setActiveAlbumMenuId(prev => (prev === itemId ? null : itemId));
  };

  // Album Management
  const handleCreateAlbum = (name) => {
    const albumId = `album-${Date.now()}`;
    setAlbums(prev => [...prev, { id: albumId, name }]);
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
      return item.albumIds && item.albumIds.includes(activeView);
    }
    return true;
  });

  const pinnedItems = currentViewItems.filter(item => item.isPinned);
  const unpinnedItems = currentViewItems.filter(item => !item.isPinned);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const currentIds = currentViewItems.map(i => i.id);
      if (currentIds.length > 0 && currentIds.every(id => prev.has(id))) {
        return new Set();
      }
      return new Set(currentIds);
    });
  }, [currentViewItems]);

  const handleRemoveSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setItems(prev => prev.filter(item => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
    setSelectMode(false);
  }, [selectedIds, setItems]);

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

  const isAllSelected = currentViewItems.length > 0 && currentViewItems.every(i => selectedIds.has(i.id));

  // Handlers shared by every grid card
  const cardHandlers = {
    isSelectMode,
    onToggleSelect: toggleSelect,
    albums,
    activeAlbumMenuId,
    isAnyAlbumMenuOpen: activeAlbumMenuId !== null,
    onOpen: openPreview,
    onTogglePin: togglePin,
    onToggleFavorite: toggleFavorite,
    onToggleAlbumMenu: handleToggleAlbumMenu,
    onToggleAlbum: toggleAlbumForItem,
    onRemove: removeItem
  };

  const handleReorderPinned = useCallback((reorderedPinnedItems) => {
    setItems(prev => {
      const pinnedIds = new Set(reorderedPinnedItems.map(i => i.id));
      const unpinned = prev.filter(i => !pinnedIds.has(i.id));
      return [...reorderedPinnedItems, ...unpinned];
    });
  }, [setItems]);

  return (
    <div className="app-root" onClick={() => activeAlbumMenuId && setActiveAlbumMenuId(null)}>
      <TopNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        viewTitle={currentViewTitle}
        itemCount={currentViewItems.length}
        columns={columns}
        onColumnsChange={setColumns}
        isSelectMode={isSelectMode}
        selectedCount={selectedIds.size}
        isAllSelected={isAllSelected}
        onSelectAll={handleSelectAll}
        onRemoveSelected={handleRemoveSelected}
        onToggleSelectMode={handleToggleSelectMode}
        scaleControlsRef={scaleControlsRef}
      />

      {/* Main Body with Sidebar + Canvas */}
      <div className="app-body">
        <Sidebar
          isOpen={isSidebarOpen}
          activeView={activeView}
          onSelectView={setActiveView}
          totalCount={totalCount}
          pinnedCount={pinnedCount}
          favoritesCount={favoritesCount}
          albums={albums}
          items={items}
          onCreateAlbum={handleCreateAlbum}
          onDeleteAlbum={handleDeleteAlbum}
        />

        {/* Gallery Workspace Canvas or Expanded Pinned Focus Board */}
        {isPinnedExpanded && pinnedItems.length > 0 ? (
          <PinnedBoard
            items={pinnedItems}
            onTogglePin={togglePin}
            onToggleFavorite={toggleFavorite}
            onOpenPreview={openPreview}
            onCloseBoard={() => setPinnedExpanded(false)}
            onReorder={handleReorderPinned}
          />
        ) : (
          <main
            className="app-container"
            onDragOver={handleWindowDragOver}
            onDrop={handleWindowDrop}
          >
            {currentViewItems.length === 0 ? (
              <EmptyState viewTitle={currentViewTitle} onLoadSample={handleResetSampleGallery} />
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
                      <button
                        type="button"
                        className="expand-section-btn"
                        onClick={() => setPinnedExpanded(true)}
                        title="Expand pinned images into a single optimized focus panel"
                      >
                        <IconExpand />
                        <span>Expand Board</span>
                      </button>
                    </div>
                    <MasonryGrid
                      columns={columns}
                      items={pinnedItems}
                      selectedIds={selectedIds}
                      {...cardHandlers}
                    />
                  </section>
                )}

                <section className="section-block gallery-section">
                  {activeView === 'pinned' && (
                    <div className="section-header">
                      <div className="section-title-wrap">
                        <span className="section-dot pinned"></span>
                        <span className="section-label">PINNED REFERENCES</span>
                        <span className="section-pill">{pinnedItems.length}</span>
                      </div>
                      <button
                        type="button"
                        className="expand-section-btn"
                        onClick={() => setPinnedExpanded(true)}
                        title="Expand pinned images into a single optimized focus panel"
                      >
                        <IconExpand />
                        <span>Expand Board</span>
                      </button>
                    </div>
                  )}

                  {activeView !== 'pinned' && pinnedItems.length > 0 && (
                    <div className="section-header">
                      <div className="section-title-wrap">
                        <span className="section-dot"></span>
                        <span className="section-label">ALL ASSETS</span>
                        <span className="section-pill">{unpinnedItems.length}</span>
                      </div>
                    </div>
                  )}
                  <MasonryGrid
                    columns={columns}
                    items={activeView === 'pinned' ? pinnedItems : unpinnedItems}
                    selectedIds={selectedIds}
                    {...cardHandlers}
                  />
                </section>
              </div>
            )}
          </main>
        )}
      </div>

      {/* Studio Lightbox Preview Modal */}
      {previewData && (
        <Lightbox
          itemList={previewData.itemList}
          index={previewData.index}
          onClose={closePreview}
          onNext={showNextPreview}
          onPrev={showPrevPreview}
          onToggleFavorite={toggleFavorite}
          onTogglePin={togglePin}
        />
      )}
    </div>
  );
}

export default App;
