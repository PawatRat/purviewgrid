import { IconPin, IconStar, IconExpand, IconTrash, IconTag } from './icons';
import { getImageSrc } from '../utils/image';

export default function ImageCard({
  item,
  index,
  isDeleteMode,
  albums,
  isAlbumMenuOpen,
  isAnyAlbumMenuOpen,
  onToggleAlbumMenu,
  onToggleAlbum,
  onOpen,
  onTogglePin,
  onToggleFavorite,
  onRemove
}) {
  return (
    <div
      className={`image-card ${isDeleteMode ? 'in-delete-mode' : ''}`}
      onClick={() => {
        if (!isDeleteMode && !isAnyAlbumMenuOpen) {
          onOpen();
        }
      }}
      style={{ '--stagger': Math.min(index, 24) }}
    >
      <div className="card-inner">
        {/* Subtle contrast gradient on hover */}
        <div className="card-scrim" />

        {/* Action Bar */}
        <div className="card-actions">
          <div className="left-actions">
            <button
              type="button"
              className={`card-btn pin-btn ${item.isPinned ? 'pinned' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(item.id);
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
                onToggleFavorite(item.id);
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
                onToggleAlbumMenu(item.id);
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
                  onOpen();
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
                  onRemove(item.id);
                }}
                title="Remove item"
              >
                <IconTrash />
              </button>
            )}
          </div>
        </div>

        {/* Album Assignment Popover */}
        {isAlbumMenuOpen && (
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
                    onClick={() => onToggleAlbum(item.id, alb.id)}
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
          <img src={getImageSrc(item.path)} alt="Gallery Item" loading="lazy" draggable="false" />
        </div>
      </div>
    </div>
  );
}
