// AI-assisted: see docs/AI_LOG.md #29
// Lectura completa de una consulta en páginas. Devuelve todos los documentos
// o lanza un error: nunca un resultado parcial, para que una lista
// incompleta no se presente como total.

// Límite de seguridad para no entrar en un bucle sin fin.
export const DEFAULT_MAX_PAGES = 200;

/**
 * @param {(cursor: object|null) => Promise<Array>} fetchPage Devuelve los
 *   documentos de la página que empieza después de `cursor` (null en la
 *   primera). Cada página debe pedir exactamente `pageSize` documentos.
 * @param {number} pageSize Tamaño de página.
 * @param {number} maxPages Máximo de páginas antes de abortar.
 * @returns {Promise<Array>} Todos los documentos, en orden.
 */
export async function fetchAllPages(
  fetchPage,
  pageSize,
  maxPages = DEFAULT_MAX_PAGES
) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('El tamaño de página debe ser un entero positivo.');
  }

  const documents = [];
  let cursor = null;

  for (let page = 0; page < maxPages; page += 1) {
    const pageDocuments = await fetchPage(cursor);

    documents.push(...pageDocuments);

    // Una página incompleta es la última.
    if (pageDocuments.length < pageSize) {
      return documents;
    }

    cursor = pageDocuments[pageDocuments.length - 1];
  }

  throw new Error(
    'La consulta superó el número máximo de páginas; no se presentan datos parciales.'
  );
}
