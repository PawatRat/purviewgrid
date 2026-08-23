import Masonry from 'react-masonry-css';
import ImageCard from './ImageCard';

/**
 * Pinterest-style masonry grid. Renders nothing for an empty list.
 * All card-level interactions are forwarded through `cardHandlers`.
 */
export default function MasonryGrid({ columns, items, selectedIds, activeAlbumMenuId, activeBoardMenuId, onOpenItem, ...cardHandlers }) {
  if (items.length === 0) return null;

  return (
    <Masonry
      breakpointCols={columns}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {items.map((item, idx) => (
        <ImageCard
          key={item.id}
          item={item}
          index={idx}
          isSelected={selectedIds ? selectedIds.has(item.id) : false}
          isAlbumMenuOpen={activeAlbumMenuId === item.id}
          isBoardMenuOpen={activeBoardMenuId === item.id}
          {...cardHandlers}
          onOpen={() => {
            if (onOpenItem) {
              onOpenItem(item);
            } else if (cardHandlers.onOpen) {
              cardHandlers.onOpen(items, idx);
            }
          }}
        />
      ))}
    </Masonry>
  );
}
