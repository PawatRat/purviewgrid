import { useState, useEffect } from 'react';
import Masonry from 'react-masonry-css';
import './App.css';

function App() {
  const [images, setImages] = useState([]);
  const [columns, setColumns] = useState(4); // Default Scale
  const [draggingIdx, setDraggingIdx] = useState(null); // Track which item is being dragged
  const [isDeleteMode, setDeleteMode] = useState(false); // Edit/Delete mode

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
          const newImages = [...prev];
          imageFiles.forEach(f => {
            if (!newImages.includes(f)) newImages.push(f);
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
  }, []);

  // Window drag handlers (for adding new files)
  const handleWindowDragOver = (e) => {
    e.preventDefault();
  };

  const handleWindowDrop = (e) => {
    e.preventDefault();
    if (draggingIdx !== null) return; // Ignore internal element reorder drops
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).map(f => f.path);
      const imageFiles = droppedFiles.filter(f => /\.(png|jpe?g|gif|webp|bmp)$/i.test(f));
      
      setImages(prev => {
        const newImages = [...prev];
        imageFiles.forEach(f => {
          if (!newImages.includes(f)) newImages.push(f);
        });
        return newImages;
      });
    }
  };

  // Internal Item drag handlers (reordering)
  const handleItemDragStart = (e, index) => {
    e.stopPropagation();
    setDraggingIdx(index);
    e.dataTransfer.effectAllowed = "move";
    // Optional: Make it slightly transparent while dragging
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleItemDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggingIdx(null);
  };

  const handleItemDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  };

  const handleItemDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingIdx === null || draggingIdx === dropIndex) return;

    setImages(prev => {
      const newImages = [...prev];
      const [movedItem] = newImages.splice(draggingIdx, 1);
      newImages.splice(dropIndex, 0, movedItem);
      return newImages;
    });
    setDraggingIdx(null);
  };

  const handleRemoveImage = (e, indexToRemove) => {
    e.stopPropagation();
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
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

      {images.length === 0 ? (
        <div className="empty-state">
          No images loaded. Drag and drop some images here!
        </div>
      ) : (
        <Masonry
          breakpointCols={columns}
          className="my-masonry-grid"
          columnClassName="my-masonry-grid_column"
        >
          {images.map((img, idx) => (
            <div 
              key={`${img}-${idx}`} 
              className="image-card"
              draggable={!isDeleteMode}
              onDragStart={(e) => !isDeleteMode && handleItemDragStart(e, idx)}
              onDragEnd={!isDeleteMode ? handleItemDragEnd : undefined}
              onDragOver={!isDeleteMode ? handleItemDragOver : undefined}
              onDrop={(e) => !isDeleteMode && handleItemDrop(e, idx)}
            >
              {isDeleteMode && (
                <div 
                  className="delete-badge" 
                  onClick={(e) => handleRemoveImage(e, idx)}
                  title="Remove Image"
                >
                  ✕
                </div>
              )}
              <img src={`file://${img}`} alt={`img-${idx}`} loading="lazy" />
            </div>
          ))}
        </Masonry>
      )}
    </div>
    </>
  );
}

export default App;
