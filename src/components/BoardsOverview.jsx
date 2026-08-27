import { useState } from 'react';
import { IconBoard, IconClose, IconEdit, IconPlus } from './icons';
import { getImageSrc } from '../utils/image';
import '../styles/boardsOverview.css';

export default function BoardsOverview({
  boards,
  items,
  onSelectBoard,
  onCreateBoard,
  onRenameBoard,
  onDeleteBoard
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const itemMap = new Map(items.map(item => [item.id, item]));

  const createBoard = () => {
    const name = newBoardName.trim();
    setIsCreating(false);
    setNewBoardName('');
    if (name) onCreateBoard(name);
  };

  const finishRename = () => {
    const name = editingName.trim();
    if (editingBoardId && name) onRenameBoard(editingBoardId, name);
    setEditingBoardId(null);
    setEditingName('');
  };

  return (
    <div className="boards-overview-container">
      <div className="boards-overview-grid">
        {boards.map(board => {
          const boardItems = board.itemIds.map(id => itemMap.get(id)).filter(Boolean);
          const previews = boardItems.slice(0, 4);

          return (
            <div key={board.id} className="board-card-item" onClick={() => onSelectBoard(board.id)}>
              <div className={`board-cover ${previews.length === 0 ? 'is-empty' : ''}`}>
                {previews.length === 0 ? (
                  <div className="board-cover-empty">
                    <IconBoard size={28} />
                    <span>Empty board</span>
                  </div>
                ) : (
                  <div className={`board-cover-grid preview-count-${previews.length}`}>
                    {previews.map((item, index) => (
                      <div key={item.id} className={`board-cover-cell cell-${index + 1}`}>
                        <img src={getImageSrc(item.path, item.modifiedAt)} alt="" loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}
                <span className="board-expand-label">Open board</span>
              </div>

              <div className="board-card-meta">
                <div className="board-card-info">
                  {editingBoardId === board.id ? (
                    <form
                      onSubmit={(event) => { event.preventDefault(); finishRename(); }}
                      onClick={event => event.stopPropagation()}
                    >
                      <input
                        autoFocus
                        className="board-name-input"
                        value={editingName}
                        onChange={event => setEditingName(event.target.value)}
                        onBlur={finishRename}
                        onKeyDown={event => {
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            setEditingBoardId(null);
                          }
                        }}
                      />
                    </form>
                  ) : (
                    <span className="board-card-name">{board.name}</span>
                  )}
                  <span className="board-card-count">{boardItems.length} {boardItems.length === 1 ? 'image' : 'images'}</span>
                </div>
                <div className="board-card-actions">
                  <button
                    type="button"
                    className="board-card-action"
                    onClick={event => {
                      event.stopPropagation();
                      setEditingBoardId(board.id);
                      setEditingName(board.name);
                    }}
                    title="Rename board"
                  >
                    <IconEdit />
                  </button>
                  <button
                    type="button"
                    className="board-card-action is-danger"
                    onClick={event => onDeleteBoard(event, board.id)}
                    title="Delete board"
                  >
                    <IconClose />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <div className="board-card-item" onClick={() => !isCreating && setIsCreating(true)} title="Create new board">
          <div className="create-board-card-stage">
            {isCreating ? (
              <form
                className="create-board-input-wrap"
                onSubmit={event => { event.preventDefault(); createBoard(); }}
                onClick={event => event.stopPropagation()}
              >
                <input
                  autoFocus
                  className="create-board-inline-input"
                  placeholder="Board name..."
                  value={newBoardName}
                  onChange={event => setNewBoardName(event.target.value)}
                  onBlur={createBoard}
                  onKeyDown={event => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setIsCreating(false);
                      setNewBoardName('');
                    }
                  }}
                />
              </form>
            ) : (
              <IconPlus size={18} />
            )}
          </div>
          <div className="board-card-meta is-placeholder"><span>Create board</span></div>
        </div>
      </div>
    </div>
  );
}
