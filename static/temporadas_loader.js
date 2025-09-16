// temporadas_loader.js (updated to hide internal ID in label)
(function () {
  const selFrig = document.getElementById('selFrigorifico');
  const selCli  = document.getElementById('selCliente');
  const selTemp = document.getElementById('selTemporada') || document.getElementById('temporadaSelect');

  if (!selFrig || !selCli || !selTemp) {
    console.warn('[temporadas_loader] Falta algún select: selFrigorifico, selCliente o selTemporada');
    return;
  }

  function sanitizeSeasonLabel(label) {
    // Convierte a string y elimina "Temporada <n> " si aparece antes de los paréntesis
    let t = String(label ?? '');
    // Ej.: "Temporada 4 (06-11-2024 a 04-05-2025)" -> "Temporada (06-11-2024 a 04-05-2025)"
    t = t.replace(/^Temporada\s+\d+\s*(?=\()/i, 'Temporada ');
    return t.trim();
  }

  function setLoading(select, loading) {
    if (!select) return;
    if (loading) {
      select.innerHTML = '<option value="">Cargando temporadas...</option>';
      select.disabled = true;
    } else {
      select.disabled = false;
    }
  }

  function populateSeasons(rows) {
    selTemp.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = '— Seleccionar temporada —';
    selTemp.appendChild(opt0);

    if (!Array.isArray(rows) || rows.length === 0) return;

    rows.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id; // value sigue siendo el id interno (para usarlo al aplicar)
      opt.textContent = sanitizeSeasonLabel(r.label);
      selTemp.appendChild(opt);
    });
  }

  function loadSeasons() {
    const fr = selFrig.value || '';
    const cl = selCli.value || '';

    selTemp.innerHTML = '<option value="">— Seleccionar temporada —</option>';

    if (!fr) {
      selTemp.disabled = true;
      return;
    }

    const url = new URL('/api/faena/la-pampa/temporadas', window.location.origin);
    url.searchParams.set('frigorifico', fr);
    if (cl) url.searchParams.set('cliente', cl);

    setLoading(selTemp, true);
    fetch(url.toString())
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const rows = Array.isArray(data?.rows) ? data.rows : (Array.isArray(data) ? data : []);
        populateSeasons(rows);
      })
      .catch(err => {
        console.error('[temporadas_loader] Error cargando temporadas:', err);
        selTemp.innerHTML = '<option value="">(sin temporadas)</option>';
      })
      .finally(() => setLoading(selTemp, false));
  }

  selFrig.addEventListener('change', loadSeasons);
  selCli.addEventListener('change', loadSeasons);

  // Si al abrir la página ya hay frigorífico (y/o cliente) seleccionado, precarga.
  if (selFrig.value) loadSeasons();
})();
