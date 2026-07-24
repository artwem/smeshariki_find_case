// Коллекция-сайт «Смешарики»: co-brand-лого рядом с брендом CASE.PLACE.
// ДЕПЛОИТСЯ ВМЕСТО shops.js (тот же слот <script src="shops.js">): на коллекция-
// сайте один магазин на площадку, селектор не нужен -> его место занимает бренд-
// лого. Основной сайт по-прежнему грузит настоящий shops.js (селектор магазинов).
// Стили — в общем styles.css (.brand-collection*): на основном сайте этих элементов
// нет, поэтому правила там инертны.
document.addEventListener('DOMContentLoaded', () => {
  const brand = document.querySelector('.site-header .brand');
  if (!brand || brand.querySelector('.brand-collection')) return;
  const lockup = document.createElement('span');
  lockup.className = 'brand-collection';
  lockup.innerHTML =
    '<span class="brand-collection-label">коллекция</span>' +
    '<img class="brand-collection-logo" src="smeshariki-logo.png" alt="Смешарики" />';
  brand.appendChild(lockup);
});
