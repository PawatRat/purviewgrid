import Masonry from 'react-masonry-css';
import ImageCard from './ImageCard';

/**
 * Pinterest-style masonry grid. Renders nothing for an empty list.
 * All card-level interactions are forwarded through `cardHandlers`.
 */
export default function MasonryGrid({ columns, items, activeAlbumMenuId, ...cardHandlers }) {
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
          isAlbumMenuOpen={activeAlbumMenuId === item.id}
          {...cardHandlers}
          onOpen={() => cardHandlers.onOpen(items, idx)}
        />
      ))}
    </Masonry>
  );
}
