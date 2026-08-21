import { useState } from 'react';
import { IconClock, IconPin, IconStar, IconFolder, IconPlus, IconClose } from './icons';
import '../styles/sidebar.css';

export default function Sidebar({
  isOpen,
  activeView,
  onSelectView,
  totalCount,
  pinnedCount,
  favoritesCount,
  albums,
  items,
  onCreateAlbum,
  onDeleteAlbum,
  onImportImages
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;
    onCreateAlbum(newAlbumName.trim());
    setNewAlbumName('');
    setIsCreating(false);
  };

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div>
        <div className="sidebar-section">
          <div className="sidebar-section-title">LIBRARY</div>
          <button
            type="button"
            className={`sidebar-nav-item ${activeView === 'all' ? 'active' : ''}`}
            onClick={() => onSelectView('all')}
          >
            <span className="sidebar-nav-icon"><IconClock /></span>
            <span className="sidebar-nav-label">All History</span>
            <span className="sidebar-nav-count">{totalCount}</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeView === 'pinned' ? 'active' : ''}`}
            onClick={() => onSelectView('pinned')}
          >
            <span className="sidebar-nav-icon gold"><IconPin filled /></span>
            <span className="sidebar-nav-label">Pinned</span>
            <span className="sidebar-nav-count">{pinnedCount}</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeView === 'favorites' ? 'active' : ''}`}
            onClick={() => onSelectView('favorites')}
          >
            <span className="sidebar-nav-icon yellow"><IconStar filled /></span>
            <span className="sidebar-nav-label">Favorites</span>
            <span className="sidebar-nav-count">{favoritesCount}</span>
          </button>

          <button
            type="button"
            className="sidebar-import-btn"
            onClick={onImportImages}
            title="Import images or entire folders (⌘O)"
          >
            <IconPlus />
            <span>Import Images or Folders</span>
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">ALBUMS</span>
            <button
              type="button"
              className="add-album-btn"
              onClick={() => setIsCreating(true)}
              title="Create New Album"
            >
              <IconPlus />
            </button>
          </div>

          {isCreating && (
            <form className="new-album-form" onSubmit={handleSubmit}>
              <input
                type="text"
                autoFocus
                placeholder="Album name..."
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                onBlur={() => !newAlbumName.trim() && setIsCreating(false)}
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
                  onClick={() => onSelectView(alb.id)}
                >
                  <span className="sidebar-nav-icon"><IconFolder /></span>
                  <span className="sidebar-nav-label">{alb.name}</span>
                  <span className="sidebar-nav-count">{count}</span>
                  <button
                    type="button"
                    className="album-delete-btn"
                    onClick={(e) => onDeleteAlbum(e, alb.id)}
                    title="Delete album"
                  >
                    <IconClose />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
