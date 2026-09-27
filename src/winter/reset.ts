// Explicit ownership: never clear other games or applications on this origin.
export const WINTER_SAVE_KEYS = Object.freeze([
  'winter-campaign-v1',
  'winter-last-chapter-v1',
  'winter-settings-v1',
  'winter-louvre-v1',
  'winter-canal-v1',
  'winter-glasshouse-v1',
  'winter-observatory-v1',
  'winter-spire-v1',
]);

export function resetWinterProgress(storage: Pick<Storage, 'removeItem'>) {
  for (const key of WINTER_SAVE_KEYS) storage.removeItem(key);
}

/** Reset on the new document, after the previous page has finished its final save. */
export function consumeWinterReset(win: Pick<Window, 'location' | 'history' | 'localStorage'>) {
  const url = new URL(win.location.href);
  if (url.searchParams.get('reset') !== '1') return false;
  resetWinterProgress(win.localStorage);
  url.searchParams.delete('reset');
  win.history.replaceState(win.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  return true;
}
