import { IconBoard, IconPin, IconStar, IconExpand, IconTag, IconCheck } from './icons';
import { getImageSrc } from '../utils/image';

export default function ImageCard({
  item,
  index,
  isSelectMode,
  isSelected,
  onToggleSelect,
  albums,
  boards,
  isAlbumMenuOpen,
  isBoardMenuOpen,
  isAnyAlbumMenuOpen,
  onToggleAlbumMenu,
  onToggleAlbum,
  onToggleBoardMenu,
  onToggleBoard,
  onOpen,
  onTogglePin,
  onToggleFavorite,
  overlay
}) {
  const handleCardClick = () => {
    if (isSelectMode) {
      onToggleSelect(item.id);
    } else if (!isAnyAlbumMenuOpen) {
      onOpen();
    }
  };

  return (
    <div
      className={`image-card ${isSelectMode ? 'in-select-mode' : ''} ${isSelected ? 'is-selected' : ''}`}
      onClick={handleCardClick}
      style={{ '--stagger': Math.min(index, 24) }}
    >
      <div className="card-inner">
        {/* Subtle contrast gradient on hover */}
        <div className="card-scrim" />

        {/* Selection Checkbox Badge when in Select Mode */}
        {isSelectMode && (
          <div
            className={`card-select-badge ${isSelected ? 'selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item.id);
            }}
          >
            {isSelected && <IconCheck size={11} />}
          </div>
        )}

        {/* Action Bar (Only when not in select mode) */}
        {!isSelectMode && (
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
              <button
                type="button"
                className={`card-btn board-btn ${(boards || []).some(board => board.itemIds.includes(item.id)) ? 'assigned' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBoardMenu(item.id);
                }}
                title="Add to Board"
              >
                <IconBoard size={12} />
              </button>

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
            </div>
          </div>
        )}

        {isBoardMenuOpen && (
          <div className="album-popover board-popover" onClick={(e) => e.stopPropagation()}>
            <div className="album-popover-header">Add to Board</div>
            {boards.length === 0 ? (
              <div className="album-popover-empty">Create a board from the Boards tab first</div>
            ) : (
              boards.map(board => {
                const isAssigned = board.itemIds.includes(item.id);
                return (
                  <div
                    key={board.id}
                    className={`album-popover-item ${isAssigned ? 'assigned' : ''}`}
                    onClick={() => {
                      onToggleBoard(item.id, board.id);
                      onToggleBoardMenu(item.id);
                    }}
                  >
                    <span className="album-checkbox">{isAssigned ? '✓' : ''}</span>
                    <span className="album-popover-name">{board.name}</span>
                  </div>
                );
              })
            )}
          </div>
        )}

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
                    onClick={() => {
                      onToggleAlbum(item.id, alb.id);
                      onToggleAlbumMenu(item.id);
                    }}
                  >
                    <span className="album-checkbox">{isAssigned ? '✓' : ''}</span>
                    <span className="album-popover-name">{alb.name}</span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {overlay}

        <div className="img-container">
          <img src={getImageSrc(item.path)} alt="Gallery Item" loading="lazy" draggable="false" />
        </div>
      </div>
    </div>
  );
}
