import { IconFolder, IconExternal, IconCheck } from './icons';
import ImageCard from './ImageCard';
import '../styles/duplicates.css';

function parsePath(fullPath) {
  if (!fullPath) return { folder: '', file: 'Image', full: fullPath };
  const normalized = fullPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const parts = normalized.split('/').filter(Boolean);
  const file = parts.pop() || 'Image';
  const folder = parts.length > 0 ? parts.slice(Math.max(0, parts.length - 2)).join(' / ') : '/';
  return { folder, file, full: fullPath };
}

export default function DuplicatesView({ duplicateGroups = [], onOpenPreview, columns = 2, cardHandlers = {} }) {
  const handleReveal = (e, filePath) => {
    e.stopPropagation();
    if (window.electronAPI?.showInFolder) {
      window.electronAPI.showInFolder(filePath);
    }
  };

  const handleImageClick = (groupIndex) => {
    if (onOpenPreview) {
      const itemsList = duplicateGroups.map(g => g.item);
      onOpenPreview(itemsList, groupIndex);
    }
  };

  return (
    <div className="duplicates-view-container">
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
        <div className="duplicates-grid" style={{ '--duplicates-columns': columns }}>
          {duplicateGroups.map((group, index) => {
            const item = group.item;
            const paths = group.paths || [item.path];
            const primaryParsed = parsePath(paths[0] || item.path);
            const { activeAlbumMenuId, activeBoardMenuId, ...sharedCardHandlers } = cardHandlers;

            return (
              <article key={item.id || item.hash || index} className="duplicate-group-card">
                <div className="duplicate-image-stage" title={`Preview ${primaryParsed.file}`}>
                  <ImageCard
                    item={item}
                    index={index}
                    isSelected={false}
                    isAlbumMenuOpen={activeAlbumMenuId === item.id}
                    isBoardMenuOpen={activeBoardMenuId === item.id}
                    {...sharedCardHandlers}
                    onOpen={() => handleImageClick(index)}
                    overlay={<span className="duplicate-copy-badge">{paths.length} {paths.length === 1 ? 'copy' : 'copies'}</span>}
                  />
                </div>

                <div className="duplicate-content-stage">
                  <h2 className="duplicate-primary-title" title={primaryParsed.file}>
                    {primaryParsed.file}
                  </h2>

                  <details className="duplicate-locations-details">
                    <summary>
                      <IconFolder size={12} />
                      <span className="duplicate-location-summary" title={paths.join('\n')}>
                        {paths.map(p => parsePath(p).folder).join(' · ')}
                      </span>
                      <span className="duplicate-disclosure" aria-hidden="true" />
                    </summary>

                    <div className="duplicate-locations-list">
                      {paths.map((p) => {
                        const parsed = parsePath(p);
                        return (
                          <div key={p} className="duplicate-location-item">
                            <div className="duplicate-location-text" title={p}>
                              <span className="duplicate-folder-line">{parsed.folder}</span>
                              {parsed.file !== primaryParsed.file && (
                                <span className="duplicate-filename-line">{parsed.file}</span>
                              )}
                            </div>
                            {window.electronAPI?.showInFolder && (
                              <button
                                type="button"
                                className="duplicate-action-btn"
                                onClick={(e) => handleReveal(e, p)}
                                title={`Reveal ${parsed.file} in Finder`}
                              >
                                <IconExternal size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
