import { IconGrid } from './icons';

export default function EmptyState({ viewTitle, onLoadSample }) {
  return (
    <div className="empty-state-wrapper">
      <div className="empty-card">
        <div className="empty-icon-circle">
          <IconGrid />
        </div>
        <h3>No images in {viewTitle}</h3>
        <p>Drag and drop images onto this window, or right-click images in Finder to open them in Purview.</p>
        <button
          type="button"
          className="load-demo-btn"
          onClick={onLoadSample}
        >
          Load Sample Gallery
        </button>
      </div>
    </div>
  );
}
