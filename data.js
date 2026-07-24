/* Слой данных: магазины + загрузка выбранных файлов. */
// База данных. Пусто = same-origin: файлы лежат рядом с сайтом в find-case-site
// (GitHub Pages), куда их кладёт деплой-Action. CORS не нужен.
// (Если когда-нибудь фетчить с другого хоста — абсолютный URL с '/' на конце +
//  Access-Control-Allow-Origin на том хосте.)
const DATA_BASE = '';
const SHOPS_URL = DATA_BASE + 'shops.json';
const BAKE_DEPTH = 100;                // ДОЛЖНО совпадать с DEPTH в app.find_case_export
const LS_KEY = 'find_case.shops';

let _shopsConfig = null;
async function loadShopsConfig() {
  if (_shopsConfig) return _shopsConfig;
  const res = await fetch(SHOPS_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Не удалось загрузить ' + SHOPS_URL);
  _shopsConfig = await res.json();
  return _shopsConfig;
}

function defaultSlug(list) {
  const d = (list || []).find(s => s.default) || (list || [])[0];
  return d ? d.slug : null;
}

function getSelectedShops(config) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { saved = {}; }
  const wbValid = config.wb.some(s => s.slug === saved.wb);
  const ozValid = config.ozon.some(s => s.slug === saved.ozon);
  return {
    wb: wbValid ? saved.wb : defaultSlug(config.wb),
    ozon: ozValid ? saved.ozon : defaultSlug(config.ozon),
  };
}

function setSelectedShops(sel) {
  localStorage.setItem(LS_KEY, JSON.stringify(sel));
  _shopDataCache = null;
}

async function fetchShopCsv(slug, marketplace) {
  if (!slug) return [];
  const res = await fetch(`${DATA_BASE}shops/${slug}.csv`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Не удалось загрузить shops/${slug}.csv`);
  const rows = parseCSV(await res.text());
  for (const r of rows) r.marketplace = marketplace;
  return rows;
}

let _shopDataCache = null;
async function loadShopData() {
  if (_shopDataCache) return _shopDataCache;
  const config = await loadShopsConfig();
  const sel = getSelectedShops(config);
  const [ozon, wb] = await Promise.all([
    fetchShopCsv(sel.ozon, 'OZON'),
    fetchShopCsv(sel.wb, 'WB'),
  ]);
  _shopDataCache = { rows: ozon.concat(wb), selected: sel, config };
  return _shopDataCache;
}
