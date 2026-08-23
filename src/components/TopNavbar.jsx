import { IconChevronLeft, IconSidebar, IconMinus, IconPlus, IconRefresh, IconTrash } from './icons';
import '../styles/navbar.css';

export default function TopNavbar({
  isSidebarOpen,
  onToggleSidebar,
  activeView,
  viewTitle,
  itemCount,
  itemNoun: itemNounOverride,
  backLabel,
  onBack,
  columns,
  onColumnsChange,
  isSelectMode,
  selectedCount,
  isAllSelected,
  onSelectAll,
  onRemoveSelected,
  onToggleSelectMode,
  onImportImages,
  isCharacterOrganizing,
  onCharacterOrganizingChange,
  isCharacterScanning,
  hasCharacterManualSections,
  onResetCharacters,
  onScanCharacters,
  localCharacterImageCount,
  isCharacterDetail,
  scaleControlsRef
}) {
  const isDuplicatesView = activeView === 'duplicates';
  const isCharactersView = activeView === 'characters';
  const isAlbumsOverview = activeView === 'albums';
  const isBoardsView = activeView === 'boards' || activeView.startsWith('board-');
  const isBoardsOverview = activeView === 'boards';
  const itemNoun = itemNounOverride || (isDuplicatesView ? 'group' : isCharactersView ? 'section' : isAlbumsOverview ? 'album' : isBoardsOverview ? 'board' : 'item');

  return (
    <header className="top-navbar">
      {/* Left: Sidebar Toggle + Breadcrumb */}
      <div className="navbar-left">
        <button
          type="button"
          className={`sidebar-toggle-btn ${isSidebarOpen ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title="Toggle Navigation Sidebar (⌘B)"
        >
          <IconSidebar />
        </button>

        {onBack && (
          <button type="button" className="navbar-back-btn" onClick={onBack} title={backLabel} aria-label={backLabel}>
            <IconChevronLeft />
          </button>
        )}

        <div className="navbar-context-row">
          <div className="brand-group">
            <span className="brand-name">PURVIEW</span>
            <span className="breadcrumb-divider">/</span>
            <span className="breadcrumb-view">{viewTitle}</span>
          </div>

          <div className="item-count-badge">
            <span>{itemCount} {itemCount === 1 ? itemNoun : `${itemNoun}s`}</span>
          </div>
        </div>
      </div>

      {/* Right: Import + Scale Stepper & Selection Actions */}
      <div className="controls-bar no-drag" ref={scaleControlsRef}>
        {!isSelectMode && (
          <>
            {!isCharactersView && <button
              type="button"
              className="navbar-icon-btn import-btn"
              onClick={onImportImages}
              title="Import Images or Folders (⌘O)"
            >
              <IconPlus />
            </button>}

            {!isCharactersView && !isAlbumsOverview && !isBoardsView && <div className="scale-stepper">
            <button
              type="button"
              className="stepper-btn"
              onClick={() => onColumnsChange(prev => Math.max(1, prev - 1))}
              disabled={columns <= 1}
              title="Decrease column count"
            >
              <IconMinus />
            </button>
            <div className="scale-slider-track">
              <input
                id="scale-slider"
                type="range"
                min="1"
                max="12"
                value={columns}
                onChange={(e) => onColumnsChange(Number(e.target.value))}
                style={{ '--fill': `${((columns - 1) / 11) * 100}%` }}
                title={`Grid scale: ${columns} columns (Scroll on bar to adjust)`}
              />
            </div>
            <button
              type="button"
              className="stepper-btn"
              onClick={() => onColumnsChange(prev => Math.min(12, prev + 1))}
              disabled={columns >= 12}
              title="Increase column count"
            >
              <IconPlus />
            </button>
            <span className="columns-indicator">{columns} cols</span>
          </div>}
        </>
      )}

        {isCharactersView && !isCharacterDetail && !isSelectMode && (
          <div className="navbar-context-actions">
            {isCharacterOrganizing ? (
              <>
                {hasCharacterManualSections && <button type="button" className="navbar-context-action is-quiet" onClick={onResetCharacters}>Reset automatic</button>}
                <button type="button" className="navbar-context-action is-active" onClick={() => onCharacterOrganizingChange(false)}>Done</button>
              </>
            ) : (
              <>
                <button type="button" className="navbar-context-action" onClick={() => onCharacterOrganizingChange(true)} disabled={isCharacterScanning || itemCount === 0}>Organize</button>
                <button type="button" className="navbar-context-action" onClick={onScanCharacters} disabled={isCharacterScanning || localCharacterImageCount === 0}>
                  <IconRefresh /><span>{isCharacterScanning ? 'Analyzing' : 'Scan Library'}</span>
                </button>
              </>
            )}
          </div>
        )}

        {!isDuplicatesView && !isCharactersView && !isAlbumsOverview && !isBoardsView && (isSelectMode ? (
          <div className="select-mode-actions">
            <button
              type="button"
              className="navbar-sub-btn"
              onClick={onSelectAll}
              title="Select or deselect all items in current view"
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </button>

            <button
              type="button"
              className="navbar-remove-btn"
              onClick={onRemoveSelected}
              disabled={selectedCount === 0}
              title="Remove selected items from Purview"
            >
              <IconTrash size={13} />
              <span>Remove {selectedCount > 0 ? `(${selectedCount})` : ''}</span>
            </button>

            <button
              type="button"
              className="action-pill-btn active"
              onClick={onToggleSelectMode}
            >
              Done
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="action-pill-btn"
            onClick={onToggleSelectMode}
            disabled={itemCount === 0}
          >
            Select
          </button>
        ))}
      </div>
    </header>
  );
}
