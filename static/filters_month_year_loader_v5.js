// Loader de Mes/Año tolerante al formato del endpoint.
// Espera selects con IDs: #selFrigorifico, #selCliente, #temporadaSelect, #filter-month, #filter-year
(function () {
  const $ = sel => document.querySelector(sel);
  const selFrig = $('#selFrigorifico');
  const selCli  = $('#selCliente');
  const selTemp = $('#temporadaSelect');
  const selMes  = $('#filter-month');
  const selAno  = $('#filter-year');

  if (!selFrig || !selCli || !selTemp || !selMes || !selAno) {
    console.warn('[filters_month_year_loader_v5] No encontré uno o más selects (frigorifico/cliente/temporada/mes/año).');
    return;
  }

  const PH_MONTH = '— Mes —';
  const PH_YEAR  = '— Año —';

  function resetMonthYear(disable = true) {
    selMes.innerHTML = `<option value="">${PH_MONTH}</option>`;
    selAno.innerHTML = `<option value="">${PH_YEAR}</option>`;
    selMes.disabled = disable;
    selAno.disabled = disable;
  }

  function canFetch() {
    return selFrig.value && selCli.value;
  }

  // Normaliza la respuesta del endpoint a { months:[1..12], years:[yyyy...] }
  function normalize(data) {
    // Formatos tolerados:
    // 1) { months:[...], years:[...] }
    // 2) { rows:[{month:9,year:2025}, ...] }
    // 3) { rows:[{mm:9, yyyy:2025}, ...] }
    const norm = { months: [], years: [] };

    if (Array.isArray(data?.months)) norm.months = data.months.slice();
    if (Array.isArray(data?.years))  norm.years  = data.years.slice();

    const rows = Array.isArray(data?.rows) ? data.rows : [];
    if (rows.length) {
      const m = new Set(norm.months);
      const y = new Set(norm.years);
      rows.forEach(r => {
        const mm = r.month ?? r.mm ?? r.mes;
        const yy = r.year  ?? r.yyyy ?? r.anio ?? r.año;
        if (Number.isInteger(mm)) m.add(mm);
        if (Number.isInteger(yy)) y.add(yy);
      });
      norm.months = Array.from(m);
      norm.years  = Array.from(y);
    }

    // Ordenar
    norm.months.sort((a,b)=>a-b);
    norm.years.sort((a,b)=>a-b);
    return norm;
  }

  function fillMonths(months) {
    selMes.innerHTML = `<option value="">${PH_MONTH}</option>`;
    months.forEach(m => {
      const opt = document.createElement('option');
      opt.value = String(m);
      // Podés mapear a nombres locales si querés
      opt.textContent = m.toString().padStart(2,'0');
      selMes.appendChild(opt);
    });
    selMes.disabled = months.length === 0;
  }

  function fillYears(years) {
    selAno.innerHTML = `<option value="">${PH_YEAR}</option>`;
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      selAno.appendChild(opt);
    });
    selAno.disabled = years.length === 0;
  }

  async function cargarMesesAnios() {
    if (!canFetch()) { resetMonthYear(true); return; }

    try {
      resetMonthYear(true);
      const q = new URLSearchParams({
        frigorifico: selFrig.value,
        cliente: selCli.value,
      });
      if (selTemp.value) q.set('season_id', selTemp.value);

      const url = `/api/faena/la-pampa/meses-anios?${q.toString()}`;
      const resp = await fetch(url);
      const json = await resp.json();

      const { months, years } = normalize(json);
      fillMonths(months);
      fillYears(years);
    } catch (e) {
      console.error('[filters_month_year_loader_v5] Error cargando meses/años:', e);
      resetMonthYear(true);
    }
  }

  // Eventos que disparan recarga de mes/año:
  selFrig.addEventListener('change', cargarMesesAnios);
  selCli .addEventListener('change', cargarMesesAnios);
  selTemp.addEventListener('change', cargarMesesAnios);

  // Estado inicial
  resetMonthYear(true);
  if (canFetch()) cargarMesesAnios();
})();
