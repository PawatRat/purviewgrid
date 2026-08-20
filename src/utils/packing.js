/**
 * Optimal 2D Aspect-Ratio-Aware Viewport Packing Algorithm
 * 
 * Computes the layout to display N images inside a fixed bounding box (W x H)
 * on a single non-scrolling panel, preserving aspect ratios and maximizing
 * visible surface area.
 */

function getPartitions(n, r) {
  if (r <= 1) return [[n]];
  if (r >= n) return [Array(n).fill(1)];

  const base = Math.floor(n / r);
  const rem = n % r;
  const results = [];
  
  if (r === 2) {
    results.push([base + rem, base]);
    if (rem > 0) results.push([base, base + rem]);
  } else if (r === 3) {
    if (rem === 0) results.push([base, base, base]);
    else if (rem === 1) {
      results.push([base + 1, base, base]);
      results.push([base, base + 1, base]);
      results.push([base, base, base + 1]);
    } else if (rem === 2) {
      results.push([base + 1, base + 1, base]);
      results.push([base + 1, base, base + 1]);
      results.push([base, base + 1, base + 1]);
    }
  } else {
    const p1 = [];
    for (let i = 0; i < r; i++) p1.push(i < rem ? base + 1 : base);
    results.push(p1);

    const p2 = [];
    for (let i = 0; i < r; i++) p2.push(i >= (r - rem) ? base + 1 : base);
    results.push(p2);
  }

  return results;
}

export function computeOptimalSinglePanelPacking(items, containerWidth, containerHeight, gap = 12) {
  const n = items.length;
  if (n === 0) {
    return { positions: [], totalArea: 0, rows: 0 };
  }

  const ratios = items.map(item => item.aspectRatio && item.aspectRatio > 0 ? item.aspectRatio : 1.333);

  if (n === 1) {
    const r = ratios[0];
    let w = containerWidth;
    let h = w / r;
    if (h > containerHeight) {
      h = containerHeight;
      w = h * r;
    }
    const x = (containerWidth - w) / 2;
    const y = (containerHeight - h) / 2;
    return {
      positions: [{ id: items[0].id, x, y, width: w, height: h }],
      totalArea: w * h,
      rows: 1
    };
  }

  let bestLayout = null;
  let maxArea = -1;
  const maxRows = Math.min(n, 6);

  // 1. Evaluate Row-Based Justified Partitions
  for (let r = 1; r <= maxRows; r++) {
    const candidatePartitions = getPartitions(n, r);

    for (const partition of candidatePartitions) {
      let itemIdx = 0;
      const rowsData = [];
      let totalNaturalHeight = 0;

      for (let rowIdx = 0; rowIdx < partition.length; rowIdx++) {
        const count = partition[rowIdx];
        const rowRatios = ratios.slice(itemIdx, itemIdx + count);
        const rowItems = items.slice(itemIdx, itemIdx + count);
        itemIdx += count;

        const sumRatios = rowRatios.reduce((sum, val) => sum + val, 0);
        const availWidth = Math.max(10, containerWidth - (count - 1) * gap);
        const naturalRowHeight = availWidth / sumRatios;

        rowsData.push({
          rowItems,
          rowRatios,
          naturalRowHeight,
          count
        });

        totalNaturalHeight += naturalRowHeight;
      }

      totalNaturalHeight += (r - 1) * gap;

      const scale = totalNaturalHeight > containerHeight
        ? containerHeight / totalNaturalHeight
        : 1.0;

      let totalArea = 0;
      const currentPositions = [];
      const totalRenderedHeight = totalNaturalHeight * scale;
      const topOffset = Math.max(0, (containerHeight - totalRenderedHeight) / 2);

      let currentY = topOffset;

      for (const row of rowsData) {
        const rowHeight = row.naturalRowHeight * scale;
        const rowTotalRenderedWidth = row.rowRatios.reduce((sum, val) => sum + val * rowHeight, 0) + (row.count - 1) * gap;
        let currentX = Math.max(0, (containerWidth - rowTotalRenderedWidth) / 2);

        for (let i = 0; i < row.count; i++) {
          const item = row.rowItems[i];
          const itemRatio = row.rowRatios[i];
          const itemWidth = itemRatio * rowHeight;

          currentPositions.push({
            id: item.id,
            x: currentX,
            y: currentY,
            width: itemWidth,
            height: rowHeight
          });

          totalArea += itemWidth * rowHeight;
          currentX += itemWidth + gap;
        }

        currentY += rowHeight + gap;
      }

      if (totalArea > maxArea) {
        maxArea = totalArea;
        bestLayout = {
          positions: currentPositions,
          totalArea,
          rows: r
        };
      }
    }
  }

  // 2. Evaluate Column-Based Partition
  const maxCols = Math.min(n, 6);
  for (let c = 1; c <= maxCols; c++) {
    const candidatePartitions = getPartitions(n, c);

    for (const partition of candidatePartitions) {
      let itemIdx = 0;
      const colsData = [];
      let totalNaturalWidth = 0;

      for (let colIdx = 0; colIdx < partition.length; colIdx++) {
        const count = partition[colIdx];
        const colRatios = ratios.slice(itemIdx, itemIdx + count);
        const colItems = items.slice(itemIdx, itemIdx + count);
        itemIdx += count;

        const sumInvRatios = colRatios.reduce((sum, val) => sum + (1 / val), 0);
        const availHeight = Math.max(10, containerHeight - (count - 1) * gap);
        const naturalColWidth = availHeight / sumInvRatios;

        colsData.push({
          colItems,
          colRatios,
          naturalColWidth,
          count
        });

        totalNaturalWidth += naturalColWidth;
      }

      totalNaturalWidth += (c - 1) * gap;

      const scale = totalNaturalWidth > containerWidth
        ? containerWidth / totalNaturalWidth
        : 1.0;

      const totalRenderedWidth = totalNaturalWidth * scale;
      const leftOffset = Math.max(0, (containerWidth - totalRenderedWidth) / 2);

      let currentX = leftOffset;
      let totalArea = 0;
      const currentPositions = [];

      for (const col of colsData) {
        const colWidth = col.naturalColWidth * scale;
        const colTotalRenderedHeight = col.colRatios.reduce((sum, val) => sum + (colWidth / val), 0) + (col.count - 1) * gap;
        let currentY = Math.max(0, (containerHeight - colTotalRenderedHeight) / 2);

        for (let i = 0; i < col.count; i++) {
          const item = col.colItems[i];
          const itemRatio = col.colRatios[i];
          const itemHeight = colWidth / itemRatio;

          currentPositions.push({
            id: item.id,
            x: currentX,
            y: currentY,
            width: colWidth,
            height: itemHeight
          });

          totalArea += colWidth * itemHeight;
          currentY += itemHeight + gap;
        }

        currentX += colWidth + gap;
      }

      if (totalArea > maxArea) {
        maxArea = totalArea;
        bestLayout = {
          positions: currentPositions,
          totalArea,
          rows: c
        };
      }
    }
  }

  return bestLayout || { positions: [], totalArea: 0, rows: 1 };
}
