import { MarketType } from '../types/stock';

export interface TreemapItem {
  id: string;
  symbol: string;
  name: string;
  market: MarketType;
  value: number; // 市值
  pnlPercent: number; // 未實現損益率
}

export interface TreemapNode extends TreemapItem {
  weight: number; // 權重佔比 (0~100)
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SizedItem extends TreemapItem {
  area: number;
  weight: number;
}

function worstAspectRatio(row: SizedItem[], rowLength: number): number {
  if (row.length === 0 || rowLength === 0) return Infinity;
  const rowArea = row.reduce((sum, item) => sum + item.area, 0);
  const rowThickness = rowArea / rowLength;
  if (rowThickness === 0) return Infinity;

  let maxAspect = 0;
  for (const item of row) {
    const itemLength = item.area / rowThickness;
    const aspect = Math.max(rowThickness / itemLength, itemLength / rowThickness);
    if (aspect > maxAspect) {
      maxAspect = aspect;
    }
  }
  return maxAspect;
}

function layoutRow(row: SizedItem[], container: Rect, verticalCut: boolean): { nodes: TreemapNode[]; nextRect: Rect } {
  const rowArea = row.reduce((sum, item) => sum + item.area, 0);
  const nodes: TreemapNode[] = [];

  if (verticalCut) {
    // 縱向切：列寬為 rowArea / container.h
    const colWidth = container.h > 0 ? rowArea / container.h : 0;
    let currentY = container.y;

    for (const item of row) {
      const itemHeight = colWidth > 0 ? item.area / colWidth : 0;
      nodes.push({
        ...item,
        x: container.x,
        y: currentY,
        width: colWidth,
        height: itemHeight,
      });
      currentY += itemHeight;
    }

    return {
      nodes,
      nextRect: {
        x: container.x + colWidth,
        y: container.y,
        w: Math.max(0, container.w - colWidth),
        h: container.h,
      },
    };
  } else {
    // 橫向切：列高為 rowArea / container.w
    const rowHeight = container.w > 0 ? rowArea / container.w : 0;
    let currentX = container.x;

    for (const item of row) {
      const itemWidth = rowHeight > 0 ? item.area / rowHeight : 0;
      nodes.push({
        ...item,
        x: currentX,
        y: container.y,
        width: itemWidth,
        height: rowHeight,
      });
      currentX += itemWidth;
    }

    return {
      nodes,
      nextRect: {
        x: container.x,
        y: container.y + rowHeight,
        w: container.w,
        h: Math.max(0, container.h - rowHeight),
      },
    };
  }
}

/**
 * 計算 Squarified Treemap 節點幾何座標與尺寸
 * @param items 持股清單
 * @param width 容器寬度
 * @param height 容器高度
 */
export function computeTreemapLayout(
  items: TreemapItem[],
  width: number,
  height: number
): TreemapNode[] {
  if (!items || items.length === 0 || width <= 0 || height <= 0) {
    return [];
  }

  // 1. 過濾並排序有效市值
  const validItems = items
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalValue = validItems.reduce((sum, i) => sum + i.value, 0);
  if (totalValue <= 0) {
    return [];
  }

  const totalArea = width * height;
  const sizedItems: SizedItem[] = validItems.map((item) => ({
    ...item,
    area: (item.value / totalValue) * totalArea,
    weight: (item.value / totalValue) * 100,
  }));

  // 2. 單一項目特例處理
  if (sizedItems.length === 1) {
    return [
      {
        ...sizedItems[0],
        x: 0,
        y: 0,
        width,
        height,
      },
    ];
  }

  // 3. Squarified 遞迴排列演算法
  const result: TreemapNode[] = [];
  let currentRect: Rect = { x: 0, y: 0, w: width, h: height };
  let currentRow: SizedItem[] = [];
  let remainingItems = [...sizedItems];

  while (remainingItems.length > 0) {
    const nextItem = remainingItems[0];
    const verticalCut = currentRect.w >= currentRect.h;
    const rowLength = verticalCut ? currentRect.h : currentRect.w;

    if (currentRow.length === 0) {
      currentRow.push(nextItem);
      remainingItems.shift();
      continue;
    }

    const currentWorst = worstAspectRatio(currentRow, rowLength);
    const candidateWorst = worstAspectRatio([...currentRow, nextItem], rowLength);

    if (candidateWorst <= currentWorst) {
      // 加入新項目能改善或保持長寬比
      currentRow.push(nextItem);
      remainingItems.shift();
    } else {
      // 固化當前列
      const { nodes, nextRect } = layoutRow(currentRow, currentRect, verticalCut);
      result.push(...nodes);
      currentRect = nextRect;
      currentRow = [];
    }
  }

  // 清空剩餘的 currentRow
  if (currentRow.length > 0) {
    const verticalCut = currentRect.w >= currentRect.h;
    const { nodes } = layoutRow(currentRow, currentRect, verticalCut);
    result.push(...nodes);
  }

  return result;
}
