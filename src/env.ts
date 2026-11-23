/**
 * Beágyazott előnézetben (pl. iframe-ben megosztott demó) a böngésző tiltja
 * a nyomtatást és a letöltést. Ilyenkor magyarázatot mutatunk helyette.
 */
export const inPreviewFrame: boolean = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

export const PREVIEW_BLOCKED =
  'Ebben a beágyazott előnézetben a böngésző ezt letiltja. A saját webcímre feltöltött változatban működik.';
