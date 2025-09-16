// Title only — safe addon. No toca tu lógica de carga de tabla
// Usa el TEXTO visible del <option> (no el value) y agrega la temporada si existe

(function () {
  function $(sel) { return document.querySelector(sel); }

  const titleEl = document.getElementById('title-faena');
  if (!titleEl) return; // si no existe, no hacemos nada

  // IDs que ya usás en tu HTML
  const selFrig    = $('#selFrigorifico');
  const selCliente = $('#selCliente');
  const selTemp    = $('#temporadaSelect'); // opcional

  const getText = (sel) => {
    if (!sel) return '';
    const opt = sel.options && sel.options[sel.selectedIndex];
    return (opt && opt.textContent ? opt.textContent.trim() : '');
  };

  function refreshTitle() {
    const fVal = (selFrig && selFrig.value || '').trim();
    const cVal = (selCliente && selCliente.value || '').trim();

    if (!fVal || !cVal) {
      titleEl.textContent = 'Seleccione frigorífico y cliente';
      return;
    }

    let text = `Faena - ${getText(selFrig)} - ${getText(selCliente)}`;

    // Si hay temporada seleccionada, la agregamos entre paréntesis
    if (selTemp && selTemp.value) {
      const tText = getText(selTemp);
      if (tText) text += ` (${tText})`;
    }

    titleEl.textContent = text;
  }

  // Reaccionar a cambios de selects (no interfiere con tu JS existente)
  [selFrig, selCliente, selTemp].forEach((el) => el && el.addEventListener('change', refreshTitle));

  // Primer set: esperar a que otros loaders llenen los selects
  window.addEventListener('load', function () {
    setTimeout(refreshTitle, 0);
  });
})();
