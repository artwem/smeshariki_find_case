// ======================================================
// Страница модели: принты + кнопки WB/Ozon
// ======================================================

(function initModelPage() {
  const grid = document.getElementById('prints-grid');
  if (!grid) return;

  const titleEl    = document.getElementById('model-title');
  const eyebrowEl  = document.getElementById('model-eyebrow');
  const countEl    = document.getElementById('prints-count');
  const categoryEl = document.getElementById('model-category');

  const params = new URLSearchParams(window.location.search);
  const modelName = params.get('m');
  const categoryFilter = params.get('cat') || null;

  if (!modelName) {
    titleEl.textContent = 'Модель не указана';
    grid.innerHTML = '<div class="loading">Вернитесь в каталог и выберите модель.</div>';
    return;
  }

  titleEl.textContent = modelName;
  document.title = `${modelName} — Shift Case`;

  if (categoryFilter && categoryEl) {
    categoryEl.textContent = shortCategoryName(categoryFilter);
    categoryEl.hidden = false;
  }

  loadShopData()
    .then(({ rows }) => {
      const scoped = rows.filter(r =>
        r.cp_model === modelName &&
        (!categoryFilter || r.cp_category === categoryFilter)
      );

      if (!scoped.length) {
        countEl.textContent = '000';
        grid.innerHTML = '<div class="loading">Для этой модели нет принтов.</div>';
        return;
      }

      const models = Rank.groupModels(scoped);
      const gkMap = models.get(modelName) || new Map();
      const ranked = Rank.rankedPrints(gkMap, BAKE_DEPTH);

      if (!ranked.length) {
        countEl.textContent = '000';
        grid.innerHTML = '<div class="loading">Для этой модели нет принтов.</div>';
        return;
      }

      countEl.textContent = String(ranked.length).padStart(3, '0');
      eyebrowEl.textContent = `${ranked.length} ${pluralize(ranked.length, ['принт', 'принта', 'принтов'])}`;

      grid.innerHTML = ranked.map(p => renderPrintCard(p.entry)).join('');

      grid.querySelectorAll('.print-image').forEach(img => {
        img.addEventListener('error', () => {
          // сначала пробуем картинку другого магазина (data-fallback), потом плейсхолдер
          const alt = img.dataset.fallback;
          if (alt && img.getAttribute('src') !== alt) {
            img.dataset.fallback = '';
            img.src = alt;
            return;
          }
          img.style.display = 'none';
          const fb = img.parentElement.querySelector('.print-image-fallback');
          if (fb) fb.classList.add('show');
        });
      });
    })
    .catch(err => {
      grid.innerHTML = `<div class="loading" style="color:var(--accent)">Ошибка: ${escapeHtml(err.message)}</div>`;
    });

  function renderPrintCard(entry) {
    // картинка: предпочитаем OZON-сторону (pp1), запасная — WB (pp2).
    // У шопов могут быть разные файлы; если основная 404 — onerror пробует запасную.
    const urls = [];
    if (entry.ozon) urls.push(printImageUrl(entry.ozon));
    if (entry.wb) urls.push(printImageUrl(entry.wb));
    const imgUrl = urls[0];
    const fallbackUrl = urls[1] || '';

    const ozonBtn = entry.ozon
      ? `<a class="btn-mp ozon" href="${escapeHtml(ozonUrl(entry.ozon.product_id))}" target="_blank" rel="noopener">
           <span class="mp-dot"></span><span>Ozon</span>
         </a>` : '';

    const wbBtn = entry.wb
      ? `<a class="btn-mp wb" href="${escapeHtml(wbUrl(entry.wb.product_id))}" target="_blank" rel="noopener">
           <span class="mp-dot"></span><span>Wildberries</span>
         </a>` : '';

    return `
      <article class="print-card">
        <div class="print-image-wrap">
          <img class="print-image" src="${escapeHtml(imgUrl)}" data-fallback="${escapeHtml(fallbackUrl)}" alt="принт" loading="lazy" />
          <div class="print-image-fallback">
            <div class="print-image-fallback-mark">◇</div>
            <div>нет превью</div>
          </div>
        </div>
        <div class="print-actions">
          ${ozonBtn}
          ${wbBtn}
        </div>
      </article>`;
  }

  function pluralize(n, forms) {
    const m = Math.abs(n) % 100;
    const m10 = m % 10;
    if (m > 10 && m < 20) return forms[2];
    if (m10 > 1 && m10 < 5) return forms[1];
    if (m10 === 1) return forms[0];
    return forms[2];
  }
})();
