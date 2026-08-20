/**
 * Resolves a stored item path into a renderable image source.
 * Remote/data URLs pass through untouched; local paths get a file:// prefix.
 */
export const getImageSrc = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  return `file://${path}`;
};
