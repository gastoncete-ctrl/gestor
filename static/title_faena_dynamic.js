// Title only — safe addon. No toca tu lógica de carga de tabla
// Usa el TEXTO visible del <option> (no el value) y agrega la temporada con formato:
//   " - Temporada [dd-mm-aaaa a dd-mm-aaaa]" (sin paréntesis dobles)
// Además centra el título sin depender del CSS externo.

(function () {
  function $(sel) { return document.querySelector(sel); }

  const titleEl = document.getElementById('title-faena');
  if (!titleEl) return; // si no existe, no hacemos nada

  // Forzamos centrado por estilo inline para evitar colisiones de CSS
  try {
    titleEl.style.textAlign = 'center';
    titleEl.style.display   = 'block';
    titleEl.style.width     = '100%';
  } catch (e) {}

  // IDs que ya usás en tu HTML
  const selFrig    = $('#selFrigorifico');
  const selCliente = $('#selCliente');
  const selTemp    = $('#temporadaSelect'); // opcional

  // Botones comunes (probables IDs)
  const btnApply = $('#apply-filter') || $('#applyFilter') || $('[data-role="apply"]');
  const btnClear = $('#clear-filter') || $('#clearFilter') || $('[data-role="clear"]');
  const form     = $('#filters-form') || $('#filtrosForm');

  const getText = (sel) => {
    if (!sel) return '';
    const opt = sel.options && sel.options[sel.selectedIndex];
    return (opt && opt.textContent ? opt.textContent.trim() : '');
  };

  // Construye el sufijo de temporada con el formato deseado
  function buildSeasonSuffix() {
    if (!(selTemp && selTemp.value)) return '';
    const tText = getText(selTemp); // p.ej.: "Temporada (05-05-2025 a 16-09-2025)"
    if (!tText) return '';

    // Extrae primer contenido dentro de paréntesis si existe
    const m = tText.match(/\(([^()]+)\)/);
    const range = (m && m[1]) ? m[1].trim() : tText.replace(/^[Tt]emporada\s*/,'').trim();
    if (!range) return '';

    return ` - Temporada [${range}]`;
  }

  function refreshTitle() {
    const fVal = (selFrig && selFrig.value || '').trim();
    const cVal = (selCliente && selCliente.value || '').trim();

    if (!fVal || !cVal) {
      titleEl.textContent = 'Seleccione frigorífico y cliente';
      return;
    }

    const fText = getText(selFrig);
    const cText = getText(selCliente);
    const seasonSuffix = buildSeasonSuffix();

    titleEl.textContent = `Faena - ${fText} - ${cText}${seasonSuffix}`;
  }

  // Reaccionar a cambios de selects (no interfiere con tu JS existente)
  [selFrig, selCliente, selTemp].forEach((el) => el && el.addEventListener('change', refreshTitle));

  // Asegurar corrección luego de "Aplicar"/"Limpiar"/submit
  const deferRefresh = () => setTimeout(refreshTitle, 0); // deja que otros handlers corran primero
  if (btnApply) btnApply.addEventListener('click', deferRefresh);
  if (btnClear) btnClear.addEventListener('click', deferRefresh);
  if (form)     form.addEventListener('submit', deferRefresh);

  // Primer set: esperar a que otros loaders llenen los selects
  window.addEventListener('load', function () {
    setTimeout(refreshTitle, 0);
  });
})();
