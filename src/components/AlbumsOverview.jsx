import { useState } from 'react';
import { IconFolder, IconPlus, IconClose } from './icons';
import { getImageSrc } from '../utils/image';
import '../styles/albumsOverview.css';

export default function AlbumsOverview({
  albums,
  items,
  onSelectAlbum,
  onCreateAlbum,
  onDeleteAlbum
}) {
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [inlineAlbumName, setInlineAlbumName] = useState('');

  const handleInlineSubmit = (e) => {
    e.preventDefault();
    if (!inlineAlbumName.trim()) {
      setIsCreatingInline(false);
      return;
    }
    onCreateAlbum(inlineAlbumName.trim());
    setInlineAlbumName('');
    setIsCreatingInline(false);
  };

  return (
    <div className="albums-overview-container">
      <div className="albums-overview-grid">
        {albums.map((album) => {
          const albumImages = items.filter(i => (i.albumIds || []).includes(album.id));
          const count = albumImages.length;

          // Extract up to 3 preview images for the stack
          const topImg = albumImages[0] ? getImageSrc(albumImages[0].path, albumImages[0].modifiedAt) : null;
          const midImg = albumImages[1] ? getImageSrc(albumImages[1].path, albumImages[1].modifiedAt) : null;
          const bottomImg = albumImages[2] ? getImageSrc(albumImages[2].path, albumImages[2].modifiedAt) : null;

          return (
            <div
              key={album.id}
              className="album-card-item"
              onClick={() => onSelectAlbum(album.id)}
            >
              <div className="album-stack-stage">
                {count === 0 ? (
                  <div className="album-stack-empty">
                    <IconFolder size={30} />
                    <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>Empty album</span>
                  </div>
                ) : (
                  <>
                    {bottomImg && (
                      <div className="album-stack-layer layer-bottom">
                        <img src={bottomImg} alt="" loading="lazy" />
                      </div>
                    )}
                    {midImg && (
                      <div className="album-stack-layer layer-mid">
                        <img src={midImg} alt="" loading="lazy" />
                      </div>
                    )}
                    {topImg && (
                      <div className="album-stack-layer layer-top">
                        <img src={topImg} alt={album.name} loading="lazy" />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="album-card-meta">
                <div className="album-card-info">
                  <span className="album-card-name">{album.name}</span>
                  <span className="album-card-count">{count} {count === 1 ? 'image' : 'images'}</span>
                </div>
                <div className="album-card-actions">
                  <button
                    type="button"
                    className="album-delete-icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAlbum(e, album.id);
                    }}
                    title="Delete Album"
                  >
                    <IconClose />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Album Card */}
        <div
          className="album-card-item"
          onClick={() => !isCreatingInline && setIsCreatingInline(true)}
          title="Create New Album"
        >
          <div className="create-album-card-stage">
            {isCreatingInline ? (
              <form className="create-album-input-wrap" onSubmit={handleInlineSubmit} onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  autoFocus
                  className="create-album-inline-input"
                  placeholder="Album name..."
                  value={inlineAlbumName}
                  onChange={(e) => setInlineAlbumName(e.target.value)}
                  onBlur={() => {
                    if (inlineAlbumName.trim()) {
                      onCreateAlbum(inlineAlbumName.trim());
                      setInlineAlbumName('');
                    }
                    setIsCreatingInline(false);
                  }}
                />
              </form>
            ) : (
              <IconPlus size={18} />
            )}
          </div>
          <div className="album-card-meta" style={{ visibility: 'hidden' }}>
            <div className="album-card-info">
              <span className="album-card-name">Placeholder</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
