import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import TopNavbar from './components/TopNavbar';
import Sidebar from './components/Sidebar';
import MasonryGrid from './components/MasonryGrid';
import EmptyState from './components/EmptyState';
import Lightbox from './components/Lightbox';
import PinnedBoard from './components/PinnedBoard';
import AlbumsOverview from './components/AlbumsOverview';
import BoardsOverview from './components/BoardsOverview';
import DuplicatesView from './components/DuplicatesView';
import CharactersView from './components/CharactersView';
import { IconExpand } from './components/icons';
import { usePersistentState } from './hooks/usePersistentState';
import { INITIAL_ITEMS, DEFAULT_ALBUMS } from './data/sampleData';
import { groupItemsByDate } from './utils/dateGroups';
import { buildCharacterSections } from './utils/characterSections';
import './styles/gallery.css';

function App() {
  // Persistent State
  const [items, setItems] = usePersistentState('purview_gallery_items', INITIAL_ITEMS);
  const [albums, setAlbums] = usePersistentState('purview_gallery_albums', DEFAULT_ALBUMS);
  const [boards, setBoards] = usePersistentState('purview_gallery_boards_v1', []);
  const [characterManualSections, setCharacterManualSections] = usePersistentState('purview_character_manual_sections_v1', []);

  // UI State
  const [activeView, setActiveView] = useState('all'); // 'all', 'pinned', 'favorites', 'duplicates', 'characters', 'albums', 'album-<id>'
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isPinnedExpanded, setPinnedExpanded] = useState(false);
  const [columns, setColumns] = useState(4);
  const [duplicateColumns, setDuplicateColumns] = useState(2);
  const [isSelectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewData, setPreviewData] = useState(null); // { itemList, index }
  const [activeAlbumMenuId, setActiveAlbumMenuId] = useState(null); // itemId for album tagging dropdown
  const [activeBoardMenuId, setActiveBoardMenuId] = useState(null);
  const [characterData, setCharacterData] = useState({ status: 'idle', groups: [], sections: [], scannedImageCount: 0, detectedFaceCount: 0 });
  const [characterProgress, setCharacterProgress] = useState(null);
  const [characterError, setCharacterError] = useState('');
  const [isCharacterOrganizing, setCharacterOrganizing] = useState(false);
  const [isCharacterResetOpen, setCharacterResetOpen] = useState(false);
  const [selectedCharacterSectionId, setSelectedCharacterSectionId] = useState(null);

  const scaleControlsRef = useRef(null);
  const wheelAccumulatorRef = useRef(0);
  const lastCharacterScanKeyRef = useRef('');

  const localCharacterItems = useMemo(() => items.filter(item => (
    typeof item.path === 'string'
    && !/^(https?:|data:|blob:)/i.test(item.path)
  )), [items]);
  const characterScanKey = useMemo(() => localCharacterItems
    .map(item => `${item.path}:${item.hash || item.createdAt || item.addedAt || ''}`)
    .sort()
    .join('|'), [localCharacterItems]);

  const addImagesToLibrary = useCallback((newIncomingItems) => {
    setItems(prev => {
      const existingPaths = new Set(prev.map(i => i.path));
      const existingHashes = new Set(prev.map(i => i.hash).filter(Boolean));
      const mapByHash = new Map();
      const mapByPath = new Map();

      const prevItemsCloned = prev.map(item => {
        const cloned = { ...item, duplicatePaths: [...(item.duplicatePaths || [item.path])] };
        if (cloned.hash) mapByHash.set(cloned.hash, cloned);
        mapByPath.set(cloned.path, cloned);
        return cloned;
      });

      const newItems = [];
      const currentAlbumId = activeView.startsWith('album-') ? activeView : null;

      newIncomingItems.forEach(incoming => {
        const itemPath = typeof incoming === 'string' ? incoming : incoming.path;
        const itemCreatedAt = (typeof incoming === 'object' && incoming.createdAt) ? incoming.createdAt : Date.now();
        const itemHash = (typeof incoming === 'object' && incoming.hash) ? incoming.hash : null;
        const itemDupPaths = (typeof incoming === 'object' && Array.isArray(incoming.duplicatePaths)) ? incoming.duplicatePaths : [itemPath];

        if (!itemPath) return;

        // If duplicate hash already exists, record duplicate location on existing item
        if (itemHash && mapByHash.has(itemHash)) {
          const existingItem = mapByHash.get(itemHash);
          itemDupPaths.forEach(p => {
            if (!existingItem.duplicatePaths.includes(p)) {
              existingItem.duplicatePaths.push(p);
            }
          });
          return;
        }

        // If duplicate path already exists, merge duplicatePaths
        if (mapByPath.has(itemPath)) {
          const existingItem = mapByPath.get(itemPath);
          if (itemHash && !existingItem.hash) existingItem.hash = itemHash;
          itemDupPaths.forEach(p => {
            if (!existingItem.duplicatePaths.includes(p)) {
              existingItem.duplicatePaths.push(p);
            }
          });
          return;
        }

        const newItem = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          path: itemPath,
          createdAt: itemCreatedAt,
          hash: itemHash,
          duplicatePaths: [...new Set(itemDupPaths)],
          addedAt: Date.now(),
          isPinned: false,
          isFavorite: false,
          albumIds: currentAlbumId ? [currentAlbumId] : []
        };

        newItems.push(newItem);
        existingPaths.add(itemPath);
        if (itemHash) {
          existingHashes.add(itemHash);
          mapByHash.set(itemHash, newItem);
        }
        mapByPath.set(itemPath, newItem);
      });

      const combined = [...newItems, ...prevItemsCloned];
      return combined.sort((a, b) => (b.createdAt || b.addedAt || 0) - (a.createdAt || a.addedAt || 0));
    });
  }, [activeView, setItems]);

  const hasBackfilledRef = useRef(false);
  const hasRescannedDuplicatesRef = useRef(false);

  // Backfill creation timestamps and exact content hashes for existing local items on launch
  useEffect(() => {
    if (hasBackfilledRef.current) return;
    if (window.electronAPI?.getFileStats) {
      const localPathsNeedingStat = items
        .filter(i => (!i.createdAt || !i.hash) && !i.path.startsWith('http'))
        .map(i => i.path);

      if (localPathsNeedingStat.length > 0) {
        hasBackfilledRef.current = true;
        window.electronAPI.getFileStats(localPathsNeedingStat).then(statsMap => {
          if (statsMap && Object.keys(statsMap).length > 0) {
            setItems(prev => {
              const seenHashes = new Set();
              const seenPaths = new Set();
              const updated = [];

              for (const item of prev) {
                const stat = statsMap[item.path];
                const hash = stat?.hash || item.hash;
                const createdAt = stat?.createdAt || item.createdAt;

                // 100% exact duplicate prevention
                if (hash) {
                  if (seenHashes.has(hash)) continue;
                  seenHashes.add(hash);
                }
                if (seenPaths.has(item.path)) continue;
                seenPaths.add(item.path);

                updated.push({
                  ...item,
                  ...(hash ? { hash } : {}),
                  ...(createdAt ? { createdAt } : {})
                });
              }

              return updated.sort((a, b) => (b.createdAt || b.addedAt || 0) - (a.createdAt || a.addedAt || 0));
            });
          }
        }).catch(() => {});
      }
    }
  }, [items, setItems]);

  useEffect(() => {
    if (!window.electronAPI?.onCharactersProgress) return undefined;
    return window.electronAPI.onCharactersProgress(setCharacterProgress);
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.getCharacterIndex) return;
    window.electronAPI.getCharacterIndex().then(cachedData => {
      if (cachedData?.groups?.length > 0) setCharacterData(cachedData);
    }).catch(() => {});
  }, []);

  const handleScanCharacters = useCallback(async () => {
    if (!window.electronAPI?.scanCharacters) {
      setCharacterData(prev => ({ ...prev, status: 'unsupported' }));
      setCharacterError('Character analysis is available in the Purview desktop app.');
      return;
    }

    lastCharacterScanKeyRef.current = characterScanKey;
    setCharacterData(prev => ({ ...prev, status: 'scanning' }));
    setCharacterProgress({ phase: 'preparing', current: 0, total: localCharacterItems.length });
    setCharacterError('');
    try {
      const result = await window.electronAPI.scanCharacters(
        localCharacterItems.map(item => ({ id: item.id, path: item.path }))
      );
      setCharacterData(result);
    } catch (error) {
      setCharacterData(prev => ({ ...prev, status: 'error' }));
      setCharacterError(error?.message || 'Character analysis could not be completed.');
    }
  }, [characterScanKey, localCharacterItems]);

  useEffect(() => {
    if (activeView !== 'characters' || characterData.status === 'scanning') return;
    if (localCharacterItems.length > 0 && lastCharacterScanKeyRef.current !== characterScanKey) {
      const scanTimer = window.setTimeout(handleScanCharacters, 0);
      return () => window.clearTimeout(scanTimer);
    }
    return undefined;
  }, [activeView, characterData.status, characterScanKey, handleScanCharacters, localCharacterItems.length]);

  const handleSelectView = useCallback((view) => {
    if (view === 'characters' || view === 'duplicates') {
      setSelectMode(false);
      setSelectedIds(new Set());
    }
    if (view !== 'characters') {
      setCharacterOrganizing(false);
      setCharacterResetOpen(false);
      setSelectedCharacterSectionId(null);
    }
    setActiveView(view);
  }, []);

  // Scan root folders for overlapping duplicate copies across directories
  useEffect(() => {
    if (hasRescannedDuplicatesRef.current) return;
    if (window.electronAPI?.rescanDuplicates && items.length > 0) {
      hasRescannedDuplicatesRef.current = true;
      window.electronAPI.rescanDuplicates(items).then(duplicateMap => {
        if (duplicateMap && Object.keys(duplicateMap).length > 0) {
          setItems(prev => prev.map(item => {
            if (item.hash && duplicateMap[item.hash]) {
              const allPaths = [...new Set([...(item.duplicatePaths || [item.path]), ...duplicateMap[item.hash]])];
              return { ...item, duplicatePaths: allPaths };
            }
            return item;
          }));
        }
      }).catch(() => {});
    }
  }, [items, setItems]);

  // IPC Ingestion
  useEffect(() => {
    const preventNav = (e) => e.preventDefault();
    window.addEventListener('dragover', preventNav);
    window.addEventListener('drop', preventNav);

    let cleanup = () => {};
    if (window.electronAPI) {
      cleanup = window.electronAPI.onOpenedFiles((files) => {
        if (files && files.length > 0) {
          addImagesToLibrary(files);
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
    if (activeView === 'characters') return undefined;
    const el = scaleControlsRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY !== 0 ? -e.deltaY : e.deltaX;
      wheelAccumulatorRef.current += delta;

      const THRESHOLD = 35;
      const updateColumns = activeView === 'duplicates' ? setDuplicateColumns : setColumns;
      if (wheelAccumulatorRef.current >= THRESHOLD) {
        const steps = Math.floor(wheelAccumulatorRef.current / THRESHOLD);
        updateColumns(prev => Math.min(12, prev + steps));
        wheelAccumulatorRef.current = wheelAccumulatorRef.current % THRESHOLD;
      } else if (wheelAccumulatorRef.current <= -THRESHOLD) {
        const steps = Math.floor(Math.abs(wheelAccumulatorRef.current) / THRESHOLD);
        updateColumns(prev => Math.max(1, prev - steps));
        wheelAccumulatorRef.current = wheelAccumulatorRef.current % THRESHOLD;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [activeView]);

  // Native Open/Import Dialog Handler
  const handleImportDialog = useCallback(() => {
    if (window.electronAPI?.openFileDialog) {
      window.electronAPI.openFileDialog();
    }
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleImportDialog();
      } else if (e.key === 'Escape' && isSelectMode) {
        setSelectMode(false);
        setSelectedIds(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectMode, handleImportDialog]);

  // Window drag handlers (Supports dropping mixed files, single images, or entire nested folders)
  const handleWindowDragOver = (e) => e.preventDefault();
  const handleWindowDrop = async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedPaths = Array.from(e.dataTransfer.files).map(f => f.path).filter(Boolean);
      if (droppedPaths.length > 0) {
        if (window.electronAPI?.scanPaths) {
          const imageFiles = await window.electronAPI.scanPaths(droppedPaths);
          if (imageFiles && imageFiles.length > 0) {
            addImagesToLibrary(imageFiles);
          }
        } else {
          const imageFiles = droppedPaths.filter(f => /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif|tiff?|ico)$/i.test(f));
          if (imageFiles.length > 0) {
            addImagesToLibrary(imageFiles);
          }
        }
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
    setActiveBoardMenuId(null);
    setActiveAlbumMenuId(prev => (prev === itemId ? null : itemId));
  };

  const handleToggleBoardMenu = (itemId) => {
    setActiveAlbumMenuId(null);
    setActiveBoardMenuId(prev => (prev === itemId ? null : itemId));
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

  // Board Management
  const handleCreateBoard = (name) => {
    const boardId = `board-${Date.now()}`;
    setBoards(prev => [...prev, { id: boardId, name, itemIds: [] }]);
    setActiveView(boardId);
  };

  const handleRenameBoard = (boardId, name) => {
    setBoards(prev => prev.map(board => board.id === boardId ? { ...board, name } : board));
  };

  const handleDeleteBoard = (event, boardId) => {
    event.stopPropagation();
    setBoards(prev => prev.filter(board => board.id !== boardId));
    if (activeView === boardId) setActiveView('boards');
  };

  const toggleBoardForItem = (itemId, boardId) => {
    setBoards(prev => prev.map(board => {
      if (board.id !== boardId) return board;
      const itemIds = board.itemIds.includes(itemId)
        ? board.itemIds.filter(id => id !== itemId)
        : [...board.itemIds, itemId];
      return { ...board, itemIds };
    }));
  };

  const handleResetSampleGallery = () => {
    setItems(INITIAL_ITEMS);
    setAlbums(DEFAULT_ALBUMS);
    setBoards([]);
    setActiveView('all');
  };

  const currentBoard = boards.find(board => board.id === activeView);

  // Filter and chronologically sort items for current view by photo creation date with 100% exact deduplication
  const currentViewItems = useMemo(() => {
    if (currentBoard) {
      const itemMap = new Map(items.map(item => [item.id, item]));
      return currentBoard.itemIds.map(id => itemMap.get(id)).filter(Boolean);
    }

    const filtered = items.filter(item => {
      if (activeView === 'all') return true;
      if (activeView === 'pinned') return item.isPinned;
      if (activeView === 'favorites') return item.isFavorite;
      if (activeView.startsWith('album-')) {
        return item.albumIds && item.albumIds.includes(activeView);
      }
      return true;
    });

    const seen = new Set();
    const deduplicated = [];
    for (const item of filtered) {
      const key = item.hash || item.path;
      if (key && !seen.has(key)) {
        seen.add(key);
        deduplicated.push(item);
      }
    }

    return deduplicated.sort((a, b) => (b.createdAt || b.addedAt || 0) - (a.createdAt || a.addedAt || 0));
  }, [items, activeView, currentBoard]);

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

  // Intelligent Overlapping & Duplicate Image Detection across folders
  const duplicateGroups = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const key = item.hash || (item.duplicatePaths && item.duplicatePaths.length > 1 ? item.path : null);
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, {
          item,
          paths: new Set(item.duplicatePaths || [item.path])
        });
      } else {
        const group = map.get(key);
        group.paths.add(item.path);
        if (item.duplicatePaths) {
          item.duplicatePaths.forEach(p => group.paths.add(p));
        }
      }
    }

    const list = [];
    for (const [, group] of map.entries()) {
      if (group.paths.size > 1) {
        list.push({
          item: group.item,
          paths: Array.from(group.paths)
        });
      }
    }
    return list;
  }, [items]);

  // Statistics
  const totalCount = items.length;
  const pinnedCount = items.filter(i => i.isPinned).length;
  const favoritesCount = items.filter(i => i.isFavorite).length;
  const duplicatesCount = duplicateGroups.length;

  const currentAlbum = albums.find(a => a.id === activeView);
  const currentViewTitle = activeView === 'all'
    ? 'All History'
    : activeView === 'pinned'
    ? 'Pinned References'
    : activeView === 'favorites'
    ? 'Favorites'
    : activeView === 'duplicates'
    ? 'Duplicates'
    : activeView === 'characters'
    ? 'Characters'
    : activeView === 'albums'
    ? 'Albums'
    : activeView === 'boards'
    ? 'Boards'
    : currentAlbum ? currentAlbum.name : currentBoard ? currentBoard.name : 'Gallery';

  const isAllSelected = currentViewItems.length > 0 && currentViewItems.every(i => selectedIds.has(i.id));

  // Handlers shared by every grid card
  const cardHandlers = {
    isSelectMode,
    onToggleSelect: toggleSelect,
    albums,
    boards,
    activeAlbumMenuId,
    activeBoardMenuId,
    isAnyAlbumMenuOpen: activeAlbumMenuId !== null || activeBoardMenuId !== null,
    onOpen: openPreview,
    onTogglePin: togglePin,
    onToggleFavorite: toggleFavorite,
    onToggleAlbumMenu: handleToggleAlbumMenu,
    onToggleAlbum: toggleAlbumForItem,
    onToggleBoardMenu: handleToggleBoardMenu,
    onToggleBoard: toggleBoardForItem,
    onRemove: removeItem
  };

  const handleReorderPinned = useCallback((reorderedPinnedItems) => {
    setItems(prev => {
      const pinnedIds = new Set(reorderedPinnedItems.map(i => i.id));
      const unpinned = prev.filter(i => !pinnedIds.has(i.id));
      return [...reorderedPinnedItems, ...unpinned];
    });
  }, [setItems]);

  const handleReorderBoard = useCallback((reorderedItems) => {
    if (!currentBoard) return;
    setBoards(prev => prev.map(board => board.id === currentBoard.id
      ? { ...board, itemIds: reorderedItems.map(item => item.id) }
      : board));
  }, [currentBoard, setBoards]);

  const targetGalleryItems = activeView === 'pinned' ? pinnedItems : unpinnedItems;
  const dateGroups = useMemo(() => {
    return groupItemsByDate(targetGalleryItems);
  }, [targetGalleryItems]);
  const characterSections = useMemo(() => buildCharacterSections(
    characterData.groups,
    characterData.sections,
    characterManualSections
  ), [characterData.groups, characterData.sections, characterManualSections]);
  const characterSectionCount = characterSections.length;
  const selectedCharacterIndex = characterSections.findIndex(section => section.id === selectedCharacterSectionId);
  const selectedCharacterSection = selectedCharacterIndex >= 0 ? characterSections[selectedCharacterIndex] : null;
  const isCharacterDetail = activeView === 'characters' && Boolean(selectedCharacterSection);
  const isAlbumDetail = Boolean(currentAlbum);
  const isBoardDetail = Boolean(currentBoard);
  const topbarViewTitle = isCharacterDetail
    ? `Character ${String(selectedCharacterIndex + 1).padStart(2, '0')}`
    : currentViewTitle;
  const topbarItemCount = isCharacterDetail
    ? selectedCharacterSection.photoCount
    : activeView === 'albums'
    ? albums.length
    : activeView === 'boards'
    ? boards.length
    : activeView === 'duplicates'
    ? duplicatesCount
    : activeView === 'characters'
    ? characterSectionCount
    : currentViewItems.length;
  const topbarItemNoun = isCharacterDetail ? 'photo' : undefined;
  const topbarBackLabel = isCharacterDetail ? 'Back to Characters' : isAlbumDetail ? 'Back to Albums' : isBoardDetail ? 'Back to Boards' : '';
  const handleTopbarBack = isCharacterDetail
    ? () => setSelectedCharacterSectionId(null)
    : isAlbumDetail
    ? () => handleSelectView('albums')
    : isBoardDetail
    ? () => handleSelectView('boards')
    : undefined;

  return (
    <div className="app-root" onClick={() => {
      if (activeAlbumMenuId) setActiveAlbumMenuId(null);
      if (activeBoardMenuId) setActiveBoardMenuId(null);
    }}>
      <TopNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        activeView={activeView}
        viewTitle={topbarViewTitle}
        itemCount={topbarItemCount}
        itemNoun={topbarItemNoun}
        backLabel={topbarBackLabel}
        onBack={handleTopbarBack}
        columns={activeView === 'duplicates' ? duplicateColumns : columns}
        onColumnsChange={activeView === 'duplicates' ? setDuplicateColumns : setColumns}
        isSelectMode={isSelectMode}
        selectedCount={selectedIds.size}
        isAllSelected={isAllSelected}
        onSelectAll={handleSelectAll}
        onRemoveSelected={handleRemoveSelected}
        onToggleSelectMode={handleToggleSelectMode}
        onImportImages={handleImportDialog}
        isCharacterOrganizing={isCharacterOrganizing}
        onCharacterOrganizingChange={setCharacterOrganizing}
        isCharacterScanning={characterData.status === 'scanning'}
        hasCharacterManualSections={characterManualSections.length > 0}
        onResetCharacters={() => setCharacterResetOpen(true)}
        onScanCharacters={handleScanCharacters}
        localCharacterImageCount={localCharacterItems.length}
        isCharacterDetail={isCharacterDetail}
        scaleControlsRef={scaleControlsRef}
      />

      {/* Main Body with Sidebar + Canvas */}
      <div className="app-body">
        <Sidebar
          isOpen={isSidebarOpen}
          activeView={activeView}
          onSelectView={handleSelectView}
          totalCount={totalCount}
          pinnedCount={pinnedCount}
          favoritesCount={favoritesCount}
          boardsCount={boards.length}
          duplicatesCount={duplicatesCount}
          charactersCount={characterSectionCount}
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
        ) : currentBoard ? (
          <PinnedBoard
            items={currentViewItems}
            title={currentBoard.name}
            showHeader={false}
            isCustomBoard
            onRemoveItem={(itemId) => toggleBoardForItem(itemId, currentBoard.id)}
            onTogglePin={togglePin}
            onToggleFavorite={toggleFavorite}
            onOpenPreview={openPreview}
            onCloseBoard={() => handleSelectView('boards')}
            onReorder={handleReorderBoard}
          />
        ) : (
          <main
            className="app-container"
            onDragOver={handleWindowDragOver}
            onDrop={handleWindowDrop}
          >
            {activeView === 'albums' ? (
              <AlbumsOverview
                albums={albums}
                items={items}
                onSelectAlbum={(albumId) => setActiveView(albumId)}
                onCreateAlbum={handleCreateAlbum}
                onDeleteAlbum={handleDeleteAlbum}
              />
            ) : activeView === 'boards' ? (
              <BoardsOverview
                boards={boards}
                items={items}
                onSelectBoard={setActiveView}
                onCreateBoard={handleCreateBoard}
                onRenameBoard={handleRenameBoard}
                onDeleteBoard={handleDeleteBoard}
              />
            ) : activeView === 'duplicates' ? (
              <DuplicatesView
                duplicateGroups={duplicateGroups}
                onOpenPreview={openPreview}
                columns={duplicateColumns}
                cardHandlers={cardHandlers}
              />
            ) : activeView === 'characters' ? (
              <CharactersView
                key={isCharacterOrganizing ? 'characters-organizing' : 'characters-browsing'}
                groups={characterData.groups}
                sections={characterSections}
                onManualSectionsChange={setCharacterManualSections}
                isOrganizing={isCharacterOrganizing}
                isResetOpen={isCharacterResetOpen}
                onResetOpenChange={setCharacterResetOpen}
                selectedSectionId={selectedCharacterSectionId}
                onSelectedSectionChange={setSelectedCharacterSectionId}
                items={items}
                status={characterData.status}
                progress={characterProgress}
                error={characterError}
                localImageCount={localCharacterItems.length}
                onOpenPreview={openPreview}
                columns={columns}
                selectedIds={selectedIds}
                cardHandlers={cardHandlers}
              />
            ) : currentViewItems.length === 0 ? (
              <EmptyState
                activeView={activeView}
                viewTitle={currentViewTitle}
                onLoadSample={handleResetSampleGallery}
                onImportImages={handleImportDialog}
              />
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
                      onOpenItem={(item) => {
                        const idx = currentViewItems.findIndex(i => i.id === item.id);
                        openPreview(currentViewItems, idx >= 0 ? idx : 0);
                      }}
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

                  {dateGroups.map(group => (
                    <div key={group.key} className="date-group-block">
                      <div className="date-group-header">
                        <span className="date-group-title">{group.label}</span>
                        <span className="date-group-count">{group.items.length} {group.items.length === 1 ? 'item' : 'items'}</span>
                      </div>
                      <MasonryGrid
                        columns={columns}
                        items={group.items}
                        selectedIds={selectedIds}
                        {...cardHandlers}
                        onOpenItem={(item) => {
                          const idx = currentViewItems.findIndex(i => i.id === item.id);
                          openPreview(currentViewItems, idx >= 0 ? idx : 0);
                        }}
                      />
                    </div>
                  ))}
                </section>
              </div>
            )}
          </main>
        )}
      </div>

      {/* Studio Lightbox Preview Modal */}
      {previewData && (
        <Lightbox
          itemList={previewData.itemList.map(previewItem => items.find(item => item.id === previewItem.id) || previewItem)}
          index={previewData.index}
          onClose={closePreview}
          onNext={showNextPreview}
          onPrev={showPrevPreview}
          onToggleFavorite={toggleFavorite}
          onTogglePin={togglePin}
          albums={albums}
          boards={boards}
          onToggleAlbum={toggleAlbumForItem}
          onToggleBoard={toggleBoardForItem}
        />
      )}
    </div>
  );
}

export default App;
