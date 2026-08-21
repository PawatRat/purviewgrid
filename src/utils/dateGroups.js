/**
 * Groups gallery items into chronological date sections (Today, Yesterday, Date, Month).
 */
export function groupItemsByDate(items) {
  if (!items || items.length === 0) return [];

  // Sort items chronologically by creation timestamp descending (newest photos first)
  const sortedItems = [...items].sort((a, b) => {
    const timeA = a.createdAt || a.addedAt || 0;
    const timeB = b.createdAt || b.addedAt || 0;
    return timeB - timeA;
  });

  const groups = [];
  const groupMap = new Map();

  for (const item of sortedItems) {
    const timestamp = item.createdAt || item.addedAt || Date.now();
    const date = new Date(timestamp);
    
    // Group key by YYYY-MM-DD for accurate daily partitioning
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (!groupMap.has(dateKey)) {
      const label = formatGroupHeader(date);
      const groupObj = {
        key: dateKey,
        label,
        timestamp,
        items: []
      };
      groupMap.set(dateKey, groupObj);
      groups.push(groupObj);
    }
    
    groupMap.get(dateKey).items.push(item);
  }

  return groups;
}

function formatGroupHeader(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today - target) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7 && diffDays > 0) {
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  }
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}
