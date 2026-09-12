/* -------- CSV parser -------- */
function parseCSV(text) {
  const rows = [];
  let cur = [''];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { cur[cur.length - 1] += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur[cur.length - 1] += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { cur.push(''); }
      else if (ch === '\n') { rows.push(cur); cur = ['']; }
      else if (ch === '\r') { /* skip */ }
      else { cur[cur.length - 1] += ch; }
    }
  }
  if (cur.length > 1 || cur[0] !== '') rows.push(cur);

  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(v => v && v.trim() !== ''))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
      return obj;
    });
}

/* -------- URL-ы для картинки и маркетплейсов -------- */
function printImageUrl(row) {
  // Готовая ссылка из CSV (print_url_compress) — источник истины, переживает
  // миграцию хоста FTP->S3. Fallback (старые кэш-CSV без колонки): строим по pp+арту.
  if (row.image_url) return row.image_url;
  // папка картинки = реальный pp принта (из данных), НЕ площадка: магазин может
  // торговать на WB принтами ПП1 (их webp лежат в pp1/), напр. Бойко.
  const sub = row.pp === 'ПП2' ? 'pp2' : 'pp1';
  return `https://shift.casecreate.ru/public/storage/PRINTS/${sub}/${row.art_print}.webp`;
}
function ozonUrl(sku) { return `https://www.ozon.ru/product/${sku}`; }
function wbUrl(nm)    { return `https://www.wildberries.ru/catalog/${nm}/detail.aspx`; }

/* -------- Утилиты -------- */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function naturalCompare(a, b) {
  return a.localeCompare(b, 'ru', { numeric: true, sensitivity: 'base' });
}


/* ======================================================
   ГЛАВНАЯ СТРАНИЦА
   ====================================================== */
function shortCategoryName(cat) {
  return cat.replace(/^\d+\.\d+\.\s*/, '');
}

function initHome() {
  const listEl     = document.getElementById('models-list');
  const countEl    = document.getElementById('model-count');
  const searchEl   = document.getElementById('search');
  const clearBtn   = document.getElementById('clear-search');
  const emptyEl    = document.getElementById('empty-state');
  const filterEl   = document.getElementById('material-filter');

  if (!listEl) return;

  let modelsByCat = new Map();   // cp_category -> Map(cp_model -> Map(group_key -> {ozon?,wb?}))
  let activeCategory = '';

  function render(filter = '') {
    const q = filter.trim().toLowerCase();
    const models = modelsByCat.get(activeCategory) || new Map();
    const ordered = Rank.orderModels(models, BAKE_DEPTH, naturalCompare);
    const filtered = q ? ordered.filter(m => m.toLowerCase().includes(q)) : ordered;

    countEl.textContent = String(filtered.length).padStart(3, '0');

    if (!filtered.length) {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    listEl.innerHTML = filtered.map(model => `
      <a class="model-card" href="model.html?m=${encodeURIComponent(model)}&cat=${encodeURIComponent(activeCategory)}">
        <div class="model-name">${escapeHtml(model)}</div>
        <span class="model-arrow">↗</span>
      </a>`).join('');
  }

  function renderTabs(categories) {
    if (!filterEl || !categories.length) return;
    filterEl.innerHTML = categories.map(cat => {
      const label = shortCategoryName(cat);
      const active = cat === activeCategory;
      return `<button class="material-tab${active ? ' active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(label)}</button>`;
    }).join('');

    filterEl.querySelectorAll('.material-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        filterEl.querySelectorAll('.material-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        btn.scrollIntoView({ inline: 'nearest', block: 'nearest' });
        render(searchEl.value);
      });
    });

    const arrowLeft  = document.getElementById('filter-arrow-left');
    const arrowRight = document.getElementById('filter-arrow-right');
    if (!arrowLeft || !arrowRight) return;

    const STEP = 200;

    function updateArrows() {
      arrowLeft.disabled  = filterEl.scrollLeft <= 0;
      arrowRight.disabled = filterEl.scrollLeft + filterEl.clientWidth >= filterEl.scrollWidth - 1;
    }

    arrowLeft.onclick  = () => { filterEl.scrollBy({ left: -STEP, behavior: 'smooth' }); };
    arrowRight.onclick = () => { filterEl.scrollBy({ left:  STEP, behavior: 'smooth' }); };
    filterEl.addEventListener('scroll', updateArrows, { passive: true });
    updateArrows();
  }

  loadShopData()
    .then(({ rows }) => {
      const byCat = new Map();
      for (const row of rows) {
        if (!row.cp_category) continue;
        if (!byCat.has(row.cp_category)) byCat.set(row.cp_category, []);
        byCat.get(row.cp_category).push(row);
      }
      modelsByCat = new Map();
      for (const [cat, catRows] of byCat) modelsByCat.set(cat, Rank.groupModels(catRows));

      const categories = Array.from(modelsByCat.keys())
        .sort((a, b) => modelsByCat.get(b).size - modelsByCat.get(a).size);
      activeCategory = categories[0] || '';
      renderTabs(categories);
      render();
    })
    .catch(err => {
      listEl.innerHTML = `<div class="loading" style="color:var(--accent)">Ошибка: ${escapeHtml(err.message)}</div>`;
    });

  searchEl.addEventListener('input', e => {
    const v = e.target.value;
    clearBtn.classList.toggle('visible', v.length > 0);
    render(v);
  });

  clearBtn.addEventListener('click', () => {
    searchEl.value = '';
    clearBtn.classList.remove('visible');
    searchEl.focus();
    render('');
  });
}

document.addEventListener('DOMContentLoaded', initHome);
