import { useMemo, useState } from 'react';
import { IconCharacters, IconCheck, IconClose, IconPlus } from './icons';
import MasonryGrid from './MasonryGrid';
import { collectFaceIds } from '../utils/characterSections';
import { getImageSrc } from '../utils/image';
import '../styles/characters.css';

function characterName(index) {
  return `Character ${String(index + 1).padStart(2, '0')}`;
}

export default function CharactersView({
  groups = [], sections = [], items = [], status = 'idle', progress, error, isOrganizing = false,
  isResetOpen = false, onResetOpenChange, selectedSectionId = null, onSelectedSectionChange,
  localImageCount = 0, onManualSectionsChange, onOpenPreview, columns = 4,
  selectedIds = new Set(), cardHandlers
}) {
  const [selectedGroupIds, setSelectedGroupIds] = useState(new Set());
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [destinationQuery, setDestinationQuery] = useState('');

  const itemByPath = useMemo(() => new Map(items.map(item => [item.path, item])), [items]);
  const groupById = useMemo(() => new Map(groups.map(group => [group.id, group])), [groups]);
  const familySections = useMemo(() => [...sections].sort((left, right) => (
    (right.photoCount || right.photoPaths.length) - (left.photoCount || left.photoPaths.length)
    || (right.variantCount || right.groupIds.length) - (left.variantCount || left.groupIds.length)
  )), [sections]);
  const selectedIndex = familySections.findIndex(section => section.id === selectedSectionId);
  const selectedSection = selectedIndex >= 0 ? familySections[selectedIndex] : null;
  const selectedItems = selectedSection
    ? selectedSection.photoPaths.map(photoPath => itemByPath.get(photoPath)).filter(Boolean)
    : [];
  const selectedFaceIds = useMemo(() => collectFaceIds([...selectedGroupIds], groups), [groups, selectedGroupIds]);
  const isScanning = status === 'scanning';
  const progressValue = progress?.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const progressLabel = progress?.phase === 'grouping'
    ? 'Grouping recurring characters'
    : progress?.total > 0 ? `Analyzing ${progress.current} of ${progress.total}` : 'Preparing local analysis';
  const destinations = familySections.filter((section, index) => {
    const query = destinationQuery.trim().toLowerCase();
    return !section.groupIds.some(groupId => selectedGroupIds.has(groupId))
      && (!query || characterName(index).toLowerCase().includes(query));
  });

  const toggleGroup = (groupId) => {
    setSelectedGroupIds(current => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const applyMove = (destinationSection = null) => {
    if (selectedFaceIds.length === 0 || !onManualSectionsChange) return;
    const movedFaceIds = new Set(selectedFaceIds);
    const destinationFaceIds = destinationSection ? collectFaceIds(destinationSection.groupIds, groups) : [];
    const destinationBucketId = destinationSection?.manualBucketId || `manual-${Date.now()}`;

    onManualSectionsChange(current => {
      const remaining = current
        .map(bucket => ({ ...bucket, faceIds: bucket.faceIds.filter(faceId => !movedFaceIds.has(faceId)) }))
        .filter(bucket => bucket.faceIds.length > 0 && bucket.id !== destinationBucketId);
      return [...remaining, {
        id: destinationBucketId,
        faceIds: [...new Set([...destinationFaceIds, ...selectedFaceIds])]
      }];
    });
    setSelectedGroupIds(new Set());
    setIsMoveOpen(false);
    setDestinationQuery('');
  };

  const resetAutomatic = () => {
    onManualSectionsChange?.([]);
    setSelectedGroupIds(new Set());
    onResetOpenChange?.(false);
  };

  return (
    <div className={`characters-view-container${isOrganizing ? ' is-organizing' : ''}${selectedSection ? ' is-detail' : ''}`}>
      {isScanning && (
        <div className="characters-progress" role="status" aria-live="polite">
          <div className="characters-progress-copy"><span>{progressLabel}</span><span>{progressValue}%</span></div>
          <div className="characters-progress-track"><span style={{ width: `${progressValue}%` }} /></div>
        </div>
      )}
      {error && <div className="characters-error">{error}</div>}

      {selectedSection ? (
        <MasonryGrid
          columns={columns}
          items={selectedItems}
          selectedIds={selectedIds}
          {...cardHandlers}
          onOpenItem={item => {
            const index = selectedItems.findIndex(candidate => candidate.id === item.id);
            onOpenPreview?.(selectedItems, index >= 0 ? index : 0);
          }}
        />
      ) : familySections.length > 0 ? (
        <div className={`character-family-list${isOrganizing ? ' is-organizing' : ''}`}>
          {familySections.map((section, index) => {
            const sectionGroups = section.groupIds.map(groupId => groupById.get(groupId)).filter(Boolean);
            const visibleGroups = isOrganizing ? sectionGroups : sectionGroups.slice(0, 7);
            const photoCount = section.photoCount || section.photoPaths.length;
            return (
              <div
                key={section.id}
                className={`character-family-card${isOrganizing ? ' is-organizing' : ''}`}
                role={isOrganizing ? undefined : 'button'}
                tabIndex={isOrganizing ? undefined : 0}
                onClick={isOrganizing ? undefined : () => onSelectedSectionChange?.(section.id)}
                onKeyDown={isOrganizing ? undefined : event => {
                  if (event.key === 'Enter' || event.key === ' ') onSelectedSectionChange?.(section.id);
                }}
              >
                <span className="character-family-copy">
                  <span className="character-family-rank">{String(index + 1).padStart(2, '0')}</span>
                  <span className="character-family-name">{characterName(index)}</span>
                  <span className="character-family-meta">
                    {photoCount} {photoCount === 1 ? 'photo' : 'photos'}<span aria-hidden="true"> · </span>
                    {sectionGroups.length} {sectionGroups.length === 1 ? 'variant' : 'close variants'}
                  </span>
                </span>
                <span className="character-variant-strip">
                  {visibleGroups.map((group, groupIndex) => {
                    const isSelected = selectedGroupIds.has(group.id);
                    const content = <><img src={getImageSrc(group.coverThumbnailPath)} alt="" loading="lazy" />
                      {isOrganizing && <span className="character-variant-check"><IconCheck size={11} /></span>}
                      <span className="character-variant-count">{group.photoPaths.length}</span></>;
                    return isOrganizing ? (
                      <button key={group.id} type="button" className={`character-variant character-variant-select${isSelected ? ' is-selected' : ''}`}
                        onClick={() => toggleGroup(group.id)} aria-pressed={isSelected}
                        aria-label={`${isSelected ? 'Deselect' : 'Select'} variant with ${group.photoPaths.length} photos`}>
                        {content}
                      </button>
                    ) : <span key={group.id} className="character-variant" style={{ zIndex: 20 - groupIndex }}>{content}</span>;
                  })}
                  {!isOrganizing && sectionGroups.length > 7 && <span className="character-variant-more">+{sectionGroups.length - 7}</span>}
                </span>
              </div>
            );
          })}
        </div>
      ) : !isScanning && (
        <div className="characters-empty">
          <div className="characters-empty-icon"><IconCharacters size={19} /></div>
          <h3>{localImageCount === 0 ? 'Import local photos first' : 'No recognizable characters yet'}</h3>
          <p>{localImageCount === 0 ? 'Characters are discovered from photos stored on this Mac.' : 'Try photos with clear, visible faces, then scan the library again.'}</p>
        </div>
      )}

      {isOrganizing && selectedGroupIds.size > 0 && (
        <div className="character-organize-toolbar" role="region" aria-label="Selected character variants">
          <span className="character-organize-count"><strong>{selectedGroupIds.size}</strong> {selectedGroupIds.size === 1 ? 'variant' : 'variants'} selected</span>
          <button type="button" className="character-toolbar-clear" onClick={() => setSelectedGroupIds(new Set())}>Clear</button>
          <span className="character-toolbar-divider" />
          <button type="button" className="character-toolbar-button" onClick={() => setIsMoveOpen(true)}>Move to…</button>
          <button type="button" className="character-toolbar-button is-primary" onClick={() => applyMove()}><IconPlus /> New section</button>
        </div>
      )}

      {isMoveOpen && (
        <div className="character-dialog-backdrop" role="presentation" onMouseDown={() => setIsMoveOpen(false)}>
          <div className="character-move-dialog" role="dialog" aria-modal="true" aria-labelledby="character-move-title" onMouseDown={event => event.stopPropagation()}>
            <div className="character-dialog-header">
              <div><h3 id="character-move-title">Move to character</h3><p>Choose the section these variants belong to.</p></div>
              <button type="button" className="character-dialog-close" onClick={() => setIsMoveOpen(false)} aria-label="Close"><IconClose /></button>
            </div>
            <input className="character-destination-search" value={destinationQuery} onChange={event => setDestinationQuery(event.target.value)}
              placeholder="Find character section" autoFocus />
            <div className="character-destination-list">
              {destinations.map(section => {
                const index = familySections.findIndex(candidate => candidate.id === section.id);
                const previews = section.groupIds.map(groupId => groupById.get(groupId)).filter(Boolean).slice(0, 3);
                return (
                  <button key={section.id} type="button" className="character-destination" onClick={() => applyMove(section)}>
                    <span className="character-destination-previews">
                      {previews.map(group => <img key={group.id} src={getImageSrc(group.coverThumbnailPath)} alt="" />)}
                    </span>
                    <span className="character-destination-copy"><strong>{characterName(index)}</strong>
                      <span>{section.photoCount} {section.photoCount === 1 ? 'photo' : 'photos'} · {section.groupIds.length} {section.groupIds.length === 1 ? 'variant' : 'variants'}</span>
                    </span>
                  </button>
                );
              })}
              {destinations.length === 0 && <p className="character-destination-empty">No matching destination</p>}
            </div>
          </div>
        </div>
      )}

      {isResetOpen && (
        <div className="character-dialog-backdrop" role="presentation" onMouseDown={() => onResetOpenChange?.(false)}>
          <div className="character-reset-dialog" role="alertdialog" aria-modal="true" aria-labelledby="character-reset-title" onMouseDown={event => event.stopPropagation()}>
            <h3 id="character-reset-title">Return to automatic grouping?</h3>
            <p>This removes your manual moves and rebuilds the sections from the local model.</p>
            <div className="character-reset-actions">
              <button type="button" onClick={() => onResetOpenChange?.(false)}>Cancel</button>
              <button type="button" className="is-danger" onClick={resetAutomatic}>Reset automatic</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
