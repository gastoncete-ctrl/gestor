// Loader de temporadas que usa 'label' del backend.
// IDs esperados: #selFrigorifico, #selCliente, #temporadaSelect
(function() {
  // Toma los IDs desde tu mapa global
  const CFG = window.FILTERS_CONFIG || {};
  const elFrig = document.querySelector(CFG.frigorifico || '#selFrigorifico');
  const elCli  = document.querySelector(CFG.cliente     || '#selCliente');
  const elTemp = document.querySelector(CFG.temporada   || '#temporadaSelect');
  const elMes  = document.querySelector(CFG.mes         || '#filter-month');
  const elAno  = document.querySelector(CFG.anio        || '#filter-year');

  if (!elFrig || !elCli || !elTemp) return;

  // Limpia y deshabilita
  function resetTemporadas() {
    elTemp.innerHTML = '<option value="">— Seleccionar temporada —</option>';
    elTemp.disabled = true;
  }
  function resetMesAno() {
    if (elMes) { elMes.selectedIndex = 0; elMes.disabled = false; }
    if (elAno) { elAno.selectedIndex = 0; elAno.disabled = false; }
  }

  async function cargarTemporadas() {
    resetTemporadas();
    resetMesAno();

    const fr = elFrig.value || '';
    const cl = elCli.value  || '';
    if (!fr || !cl) return;

    try {
      const url = `/api/faena/la-pampa/temporadas?frigorifico=${encodeURIComponent(fr)}&cliente=${encodeURIComponent(cl)}`;
      const resp = await fetch(url);
      const js   = await resp.json();

      (js.rows || []).forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;         // id interno (no se muestra)
        opt.textContent = r.label; // "Temporada (dd-mm-aaaa a dd-mm-aaaa)"
        elTemp.appendChild(opt);
      });
      elTemp.disabled = false;
    } catch (e) {
      console.error('[temporadas] error', e);
    }
  }

  elFrig.addEventListener('change', () => {
    resetTemporadas();
    resetMesAno();
    cargarTemporadas();
  });
  elCli.addEventListener('change', () => {
    resetTemporadas();
    resetMesAno();
    cargarTemporadas();
  });

  // si ya hay frigo+cliente seleccionados al entrar:
  if (elFrig.value && elCli.value) cargarTemporadas();

  // al cambiar temporada limpiamos mes/año (y de ser posible recargamos)
  elTemp.addEventListener('change', () => {
    resetMesAno();
    if (typeof window.cargarMesesAnios === 'function') {
      const fr = elFrig.value || '';
      const cl = elCli.value  || '';
      const sid = elTemp.value || '';
      window.cargarMesesAnios(fr, cl, sid || undefined);
    }
  });
})();
