import { useState, useEffect } from 'react';
import Masonry from 'react-masonry-css';
import './App.css';

function App() {
  const [images, setImages] = useState([]);
  const [pinnedImages, setPinnedImages] = useState([]);
  const [columns, setColumns] = useState(4); // Default Scale
  const [draggingItem, setDraggingItem] = useState(null); // Track which item {type, index} is being dragged
  const [isDeleteMode, setDeleteMode] = useState(false); // Edit/Delete mode

  // Helper to check duplicates
  const isDuplicate = (f, currentImages, currentPinned) => currentImages.includes(f) || currentPinned.includes(f);

  // Setup OS file opening IPC callback and global drag prevention
  useEffect(() => {
    // Prevent Chromium from navigating when dropping files outside the dropzone
    const preventNav = (e) => e.preventDefault();
    window.addEventListener('dragover', preventNav);
    window.addEventListener('drop', preventNav);

    let cleanup = () => {};
    if (window.electronAPI) {
      cleanup = window.electronAPI.onOpenedFiles((files) => {
        const imageFiles = files.filter(f => /\.(png|jpe?g|gif|webp|bmp)$/i.test(f));
        setImages(prev => {
          // We need latest pinnedImages to avoid duplicates, but since IPC is setup once, 
          // we use functional state updates which only have access to `prev` images.
          // To be perfectly safe, we allow the dropzone to handle it, but for IPC it's rare to duplicate.
          // We'll just check against `prev`.
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
  }, [pinnedImages]); // Re-bind IPC when pinnedImages changes to capture current state for duplicates

  // Window drag handlers (for adding new files)
  const handleWindowDragOver = (e) => {
    e.preventDefault();
  };

  const handleWindowDrop = (e) => {
    e.preventDefault();
    if (draggingItem !== null) return; // Ignore internal element reorder drops
    
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
      e.target.style.opacity = '0.5';
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
    
    // Constraints: cannot move between pinned and unpinned
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
            className="image-card"
            draggable={!isDeleteMode}
            onDragStart={(e) => !isDeleteMode && handleItemDragStart(e, idx, type)}
            onDragEnd={!isDeleteMode ? handleItemDragEnd : undefined}
            onDragOver={!isDeleteMode ? handleItemDragOver : undefined}
            onDrop={(e) => !isDeleteMode && handleItemDrop(e, idx, type)}
          >
            {/* Context Actions Container */}
            <div className="card-actions">
              <div 
                className={`pin-badge ${type === 'pinned' ? 'pinned' : ''}`}
                onClick={(e) => togglePin(e, img, type)}
                title={type === 'pinned' ? "Unpin Image" : "Pin Image"}
              >
                📌
              </div>
              {isDeleteMode && (
                <div 
                  className="delete-badge" 
                  onClick={(e) => handleRemoveImage(e, idx, type)}
                  title="Remove Image"
                >
                  ✕
                </div>
              )}
            </div>
            <img src={`file://${img}`} alt={`img-${idx}`} loading="lazy" />
          </div>
        ))}
      </Masonry>
    );
  };

  return (
    <>
      <div className="title-bar"></div>
      <div 
        className="app-container" 
        onDragOver={handleWindowDragOver} 
        onDrop={handleWindowDrop}
      >
        <header className="app-header">
        <h1>Purview</h1>
        <p>Drop images here or Right-Click {"->"} Open With Purview</p>
        
        {/* Control Bar (Scale / Actions) */}
        <div className="controls-bar no-drag">
          <div className="scale-controls">
            <label htmlFor="scale-slider">Scale (Columns)</label>
            <input 
              id="scale-slider"
              type="range" 
              min="1" 
              max="12" 
              value={columns} 
              onChange={(e) => setColumns(Number(e.target.value))}
              title={`Current scale: ${columns} column${columns > 1 ? 's' : ''}`}
            />
            <span className="scale-value">{columns}</span>
          </div>
          <button 
            className={`action-btn ${isDeleteMode ? 'active' : ''}`}
            onClick={() => setDeleteMode(!isDeleteMode)}
          >
            {isDeleteMode ? 'Done' : 'Edit / Remove'}
          </button>
        </div>
      </header>

      {images.length === 0 && pinnedImages.length === 0 ? (
        <div className="empty-state">
          No images loaded. Drag and drop some images here!
        </div>
      ) : (
        <div className="grids-container">
          {pinnedImages.length > 0 && (
            <div className="pinned-section">
              {renderGrid(pinnedImages, 'pinned')}
              <hr className="section-separator" />
            </div>
          )}
          {renderGrid(images, 'unpinned')}
        </div>
      )}
    </div>
    </>
  );
}

export default App;
