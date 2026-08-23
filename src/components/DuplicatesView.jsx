import { IconFolder, IconExternal, IconCheck } from './icons';
import { getImageSrc } from '../utils/image';
import '../styles/duplicates.css';

function parsePath(fullPath) {
  if (!fullPath) return { folder: '', file: 'Image', full: fullPath };
  const normalized = fullPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const parts = normalized.split('/').filter(Boolean);
  const file = parts.pop() || 'Image';
  const folder = parts.length > 0 ? parts.slice(Math.max(0, parts.length - 2)).join(' / ') : '/';
  return { folder, file, full: fullPath };
}

export default function DuplicatesView({ duplicateGroups = [], onOpenPreview }) {
  const handleReveal = (e, filePath) => {
    e.stopPropagation();
    if (window.electronAPI?.showInFolder) {
      window.electronAPI.showInFolder(filePath);
    }
  };

  const handleThumbClick = (groupIndex) => {
    if (onOpenPreview) {
      const itemsList = duplicateGroups.map(g => g.item);
      onOpenPreview(itemsList, groupIndex);
    }
  };

  return (
    <div className="duplicates-view-container">
      <div className="duplicates-header">
        <div className="duplicates-title-group">
          <span className="duplicates-title">DUPLICATES & OVERLAPS</span>
          <span className="duplicates-badge">{duplicateGroups.length} {duplicateGroups.length === 1 ? 'group' : 'groups'}</span>
        </div>
      </div>

      {duplicateGroups.length === 0 ? (
        <div className="empty-state-wrapper">
          <div className="empty-state-content">
            <div className="empty-icon-box">
              <IconCheck size={18} />
            </div>
            <h3 className="empty-title">No duplicate images</h3>
            <p className="empty-desc">All images across your folders are unique</p>
          </div>
        </div>
      ) : (
        <div className="duplicates-grid">
          {duplicateGroups.map((group, index) => {
            const item = group.item;
            const paths = group.paths || [item.path];
            const imgSrc = getImageSrc(item.path);
            const primaryParsed = parsePath(paths[0] || item.path);

            return (
              <div key={item.id || item.hash || index} className="duplicate-group-card">
                <div
                  className="duplicate-thumb-stage"
                  onClick={() => handleThumbClick(index)}
                  title="Click to view image"
                >
                  <img src={imgSrc} alt="" loading="lazy" />
                </div>

                <div className="duplicate-content-stage">
                  <div className="duplicate-card-top">
                    <span className="duplicate-primary-title" title={primaryParsed.file}>
                      {primaryParsed.file}
                    </span>
                    <span className="duplicate-locations-count">
                      {paths.length} {paths.length === 1 ? 'location' : 'locations'}
                    </span>
                  </div>

                  <div className="duplicate-locations-list">
                    {paths.map((p, pIndex) => {
                      const parsed = parsePath(p);
                      return (
                        <div key={pIndex} className="duplicate-location-item">
                          <div className="duplicate-location-details" title={p}>
                            <div className="duplicate-folder-line">
                              <IconFolder size={12} />
                              <span>{parsed.folder}</span>
                            </div>
                            {parsed.file !== primaryParsed.file && (
                              <div className="duplicate-filename-line">
                                {parsed.file}
                              </div>
                            )}
                          </div>
                          {window.electronAPI?.showInFolder && (
                            <button
                              type="button"
                              className="duplicate-action-btn"
                              onClick={(e) => handleReveal(e, p)}
                              title="Reveal in Finder"
                            >
                              <IconExternal size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
