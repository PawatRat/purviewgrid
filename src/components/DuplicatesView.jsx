import { IconLayers, IconFolder, IconExternal, IconCheck } from './icons';
import { getImageSrc } from '../utils/image';
import '../styles/duplicates.css';

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

            return (
              <div key={item.id || item.hash || index} className="duplicate-group-card">
                <div className="duplicate-visual-header">
                  <div
                    className="duplicate-thumb-wrap"
                    onClick={() => handleThumbClick(index)}
                    title="Click to view image"
                  >
                    <img src={imgSrc} alt="" loading="lazy" />
                  </div>
                  <div className="duplicate-meta-summary">
                    <div className="duplicate-summary-title">
                      <span className="duplicate-copies-badge">{paths.length} Copies</span>
                      <span>Exact Match</span>
                    </div>
                    <span className="duplicate-hash-tag">
                      {paths[0] ? paths[0].split('/').pop() : 'Image'}
                    </span>
                  </div>
                </div>

                <div className="duplicate-paths-list">
                  {paths.map((p, pIndex) => (
                    <div key={pIndex} className="duplicate-path-row">
                      <div className="duplicate-path-info">
                        <span className="duplicate-path-icon"><IconFolder size={12} /></span>
                        <span className="duplicate-path-text" title={p}>{p}</span>
                      </div>
                      {window.electronAPI?.showInFolder && (
                        <button
                          type="button"
                          className="duplicate-reveal-btn"
                          onClick={(e) => handleReveal(e, p)}
                          title="Reveal in Finder"
                        >
                          <IconExternal size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
