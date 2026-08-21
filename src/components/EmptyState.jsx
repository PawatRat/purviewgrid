import { IconGrid, IconPlus } from './icons';

export default function EmptyState({ viewTitle, onLoadSample, onImportImages }) {
  return (
    <div className="empty-state-wrapper">
      <div className="empty-card">
        <div className="empty-icon-circle">
          <IconGrid />
        </div>
        <h3>No images in {viewTitle}</h3>
        <p>Drag and drop images or whole folders anywhere onto this window, or click below to import.</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px', justifyContent: 'center' }}>
          {onImportImages && (
            <button
              type="button"
              className="load-demo-btn"
              onClick={onImportImages}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <IconPlus />
              <span>Import Images or Folders</span>
            </button>
          )}
          <button
            type="button"
            className="load-demo-btn"
            style={{ background: 'var(--bg-pill)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
            onClick={onLoadSample}
          >
            Load Sample Gallery
          </button>
        </div>
      </div>
    </div>
  );
}
