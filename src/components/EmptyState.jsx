import { IconGrid, IconPin, IconStar, IconFolder, IconPlus } from './icons';

export default function EmptyState({ activeView = 'all', viewTitle, onLoadSample, onImportImages }) {
  const isAlbum = activeView.startsWith('album-');
  const isPinned = activeView === 'pinned';
  const isFavorites = activeView === 'favorites';
  const isAll = activeView === 'all';

  let icon = <IconGrid size={18} />;
  let title = `No images in ${viewTitle}`;
  let description = 'Drag and drop images or whole folders anywhere onto this window to import.';

  if (isAlbum) {
    icon = <IconFolder size={18} />;
    title = 'This album is empty';
    description = 'Drop images here or tag from gallery';
  } else if (isPinned) {
    icon = <IconPin size={18} />;
    title = 'No pinned references';
    description = 'Pin images to keep them at top';
  } else if (isFavorites) {
    icon = <IconStar size={18} />;
    title = 'No favorites yet';
    description = 'Star images to save here';
  } else if (isAll) {
    icon = <IconGrid size={18} />;
    title = 'No images in library';
    description = 'Drop images or folders anywhere to begin';
  }

  return (
    <div className="empty-state-wrapper">
      <div className="empty-state-content">
        <div className="empty-icon-box">
          {icon}
        </div>
        <h3 className="empty-title">{title}</h3>
        <p className="empty-desc">{description}</p>
        
        {isAll && (
          <div className="empty-actions">
            {onImportImages && (
              <button
                type="button"
                className="empty-primary-btn"
                onClick={onImportImages}
              >
                <IconPlus />
                <span>Import Images or Folders</span>
              </button>
            )}
            {onLoadSample && (
              <button
                type="button"
                className="empty-secondary-btn"
                onClick={onLoadSample}
              >
                Load Sample Gallery
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
