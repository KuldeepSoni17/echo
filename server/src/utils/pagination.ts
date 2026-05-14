/**
 * Cursor-based pagination utilities.
 * Cursors are base64-encoded ISO timestamps (createdAt of last item).
 */

export function buildCursorWhere(cursor?: string): { createdAt?: { lt: Date } } {
  if (!cursor) return {};

  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const date = new Date(decoded);
    if (isNaN(date.getTime())) return {};
    return { createdAt: { lt: date } };
  } catch {
    return {};
  }
}

export function encodeCursor(date: Date): string {
  return Buffer.from(date.toISOString()).toString('base64');
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Given a list of items (fetched with limit+1 items), build a cursor response.
 * The items array should have at most `limit` items returned; if `limit+1` were
 * fetched, the extra one signals there are more pages.
 */
export function buildCursorResponse<T extends { createdAt: Date }>(
  items: T[],
  limit: number,
): PaginatedResponse<T> {
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const lastItem = pageItems[pageItems.length - 1];
  const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.createdAt) : null;

  return {
    items: pageItems,
    nextCursor,
    hasMore,
  };
}
