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
    title = `This album is empty`;
    description = `Hover over any image in your gallery and click the folder icon to add it to "${viewTitle}", or drag images directly here.`;
  } else if (isPinned) {
    icon = <IconPin size={18} />;
    title = 'No pinned references';
    description = 'Pin key images from your gallery to keep them at the top of your workspace or expand them into a focus board.';
  } else if (isFavorites) {
    icon = <IconStar size={18} />;
    title = 'No favorites yet';
    description = 'Click the star icon on any image in your gallery to save it to your favorites.';
  } else if (isAll) {
    icon = <IconGrid size={18} />;
    title = 'Your library is empty';
    description = 'Drag and drop images or whole folders anywhere onto this window, or import files to begin.';
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
