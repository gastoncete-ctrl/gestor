// v5 — Binder de filtros + render de tabla + totales + CSV
(() => {
  const CFG = window.FILTERS_CONFIG || {};
  const $ = (s) => document.querySelector(s);

  const elFrig = $(CFG.frigorifico || '#selFrigorifico');
  const elCli  = $(CFG.cliente     || '#selCliente');
  const elTemp = $(CFG.temporada   || '#temporadaSelect');
  const elMes  = $(CFG.mes         || '#filter-month');
  const elAno  = $(CFG.anio        || '#filter-year');

  const btnApply = $(CFG.aplicar || '#apply-filter');
  const btnClear = $('#clear-filter');
  const btnCsv   = $('#download-csv');

  const overlay  = $('#loading-overlay');
  const tbody    = $('#faena-tbody');

  const sumTotal   = $('#sum-total');
  const sumHalak   = $('#sum-halak');
  const sumKosher  = $('#sum-kosher');
  const sumRechazo = $('#sum-rechazo');

  const showLoading = (v) => {
    if (!overlay) return;
    overlay.setAttribute('aria-hidden', v ? 'false' : 'true');
  };

  function buildQueryParams(opts = {}) {
    const q = new URLSearchParams();
    const add = (k, v) => (v !== undefined && v !== null && v !== '' ? q.set(k, v) : null);

    add('frigorifico', opts.frigorifico ?? elFrig?.value);
    add('cliente',     opts.cliente     ?? elCli?.value);

    // si hay temporada, la priorizamos por encima de mes/año
    const sid = opts.season_id ?? elTemp?.value;
    if (sid) add('season_id', sid);
    else {
      add('month', opts.month ?? elMes?.value);
      add('year',  opts.year  ?? elAno?.value);
    }

    add('page',     opts.page ?? 1);
    add('per_page', opts.per_page ?? 5000);
    add('order',    opts.order ?? 'asc');
    return q;
  }

  function fmtInt(v)  { const n = Number(v ?? 0); return Number.isFinite(n) ? n.toLocaleString('es-AR') : '0'; }
  function fmtPct(v)  { const n = Number(v ?? 0); return `${n.toFixed(2)}%`; }
  function num(v)     { const n = Number(v); return Number.isFinite(n) ? n : 0; }

  function computePerc(part, total) {
    const t = num(total);
    return t > 0 ? (num(part) * 100) / t : 0;
  }

  function updateTitle() {
    const el = document.getElementById('title-faena');
    if (!el) return;

    // Usar el TEXTO visible del <option> seleccionado, no el value (id)
    const getText = (sel) => {
      if (!sel) return '';
      const opt = sel.options?.[sel.selectedIndex];
      return (opt?.textContent || '').trim();
    };

    const fVal = (elFrig?.value || '').trim();
    const cVal = (elCli?.value  || '').trim();

    if (!fVal || !cVal) {
      el.textContent = 'Seleccione frigorífico y cliente';
      return;
    }

    const fText = getText(elFrig);
    const cText = getText(elCli);
    el.textContent = `Faena - ${fText} - ${cText}`;
  } - ${c}`;
  }

  function extractRow(r) {
    // Aliases exactos del backend (con espacios y acentos)
    const total        = num(r['Total Animales']);
    const halak        = num(r['Aptos Halak']);
    const kosher       = num(r['Aptos Kosher']);
    const rechazo      = num(r['Rechazos']);

    const rcajon       = num(r['Rechazo por cajón']);
    const rcajon_pct   = num(r['Rechazo por cajón %']);

    const rliv        = num(r['Rechazo por Livianos']);
    const rliv_pct    = num(r['Rechazo por Livianos %']);

    const rpulRoto     = num(r['Rechazo por Pulmon roto']);
    const rpulRoto_pct = num(r['Rechazo por Pulmon roto %']);

    const rpul         = num(r['Rechazo por Pulmon']);
    const rpul_pct     = num(r['Rechazo por Pulmon %']);

    const registradas  = num(r['Total Registradas']);
    const pctTotal     = num(r['% Total']); // viene 100.00 desde el backend

    // % calculados localmente
    const halak_pct   = computePerc(halak, total);
    const kosher_pct  = computePerc(kosher, total);
    const rechazo_pct = computePerc(rechazo, total);

    return {
      fecha: r['Fecha Faena'],
      total, halak, halak_pct, kosher, kosher_pct, rechazo, rechazo_pct,
      registradas, pctTotal,
      rcajon, rcajon_pct, rliv, rliv_pct, rpulRoto, rpulRoto_pct, rpul, rpul_pct,
    };
  }

  function renderRows(rows) {
    tbody.innerHTML = '';
    const frag = document.createDocumentFragment();

    rows.forEach((r) => {
      const tr = document.createElement('tr');
      const c = extractRow(r);
      tr.innerHTML = `
        <td>${c.fecha || ''}</td>
        <td>${fmtInt(c.total)}</td>
        <td>${fmtInt(c.halak)}</td>
        <td>${fmtPct(c.halak_pct)}</td>
        <td>${fmtInt(c.kosher)}</td>
        <td>${fmtPct(c.kosher_pct)}</td>
        <td>${fmtInt(c.rechazo)}</td>
        <td>${fmtPct(c.rechazo_pct)}</td>
        <td>${fmtInt(c.registradas)}</td>
        <td>${fmtPct(c.pctTotal)}</td>
        <td>${fmtInt(c.rcajon)}</td>
        <td>${fmtPct(c.rcajon_pct)}</td>
        <td>${fmtInt(c.rliv)}</td>
        <td>${fmtPct(c.rliv_pct)}</td>
        <td>${fmtInt(c.rpulRoto)}</td>
        <td>${fmtPct(c.rpulRoto_pct)}</td>
        <td>${fmtInt(c.rpul)}</td>
        <td>${fmtPct(c.rpul_pct)}</td>
      `;
      frag.appendChild(tr);
    });

    tbody.appendChild(frag);
  }

  function updateSummary(rows) {
    let total = 0, halak = 0, kosher = 0, rechazo = 0;
    rows.forEach((r) => {
      total   += num(r['Total Animales']);
      halak   += num(r['Aptos Halak']);
      kosher  += num(r['Aptos Kosher']);
      rechazo += num(r['Rechazos']);
    });

    const halak_pct   = computePerc(halak, total);
    const kosher_pct  = computePerc(kosher, total);
    const rechazo_pct = computePerc(rechazo, total);

    if (sumTotal)   sumTotal.textContent   = `${fmtInt(total)} - 100%`;
    if (sumHalak)   sumHalak.textContent   = `${fmtInt(halak)} - ${fmtPct(halak_pct)}`;
    if (sumKosher)  sumKosher.textContent  = `${fmtInt(kosher)} - ${fmtPct(kosher_pct)}`;
    if (sumRechazo) sumRechazo.textContent = `${fmtInt(rechazo)} - ${fmtPct(rechazo_pct)}`;
  }

  async function fetchData(opts = {}) {
    const q = buildQueryParams(opts);
    const url = `/api/faena/la-pampa?${q.toString()}`;

    showLoading(true);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      const json = await resp.json();
      const rows = Array.isArray(json?.rows) ? json.rows : [];

      renderRows(rows);
      updateSummary(rows);
      return rows;
    } catch (e) {
      console.error('[faena] error cargando datos', e);
      tbody.innerHTML = `<tr><td colspan="18" style="text-align:center">No se pudieron cargar los datos.</td></tr>`;
      updateSummary([]);
      return [];
    } finally {
      showLoading(false);
    }
  }

  async function goToLatestAndLoad() {
    // Tomamos el último registro real vía API (order=desc, per_page=1),
    // parseamos dd-mm-aaaa y seteamos mes/año para que queden visibles en los selects.
    const q = buildQueryParams({ order: 'desc', per_page: 1 });
    try {
      showLoading(true);
      const resp = await fetch(`/api/faena/la-pampa?${q.toString()}`);
      const js   = await resp.json();
      const r    = (js.rows && js.rows[0]) || null;
      if (r && elMes && elAno) {
        const fecha = String(r['Fecha Faena'] || ''); // dd-mm-aaaa
        const [dd, mm, yyyy] = fecha.split('-');
        if (mm && yyyy) {
          elMes.value = String(parseInt(mm, 10));
          elAno.value = String(parseInt(yyyy, 10));
        }
      }
    } catch (e) {
      console.warn('[faena] no pude obtener el último mes', e);
    } finally {
      showLoading(false);
    }
    return fetchData();
  }

  function buildCsv(rows) {
    const header = [
      'Fecha de Faena', 'Total de Cabezas',
      'Halak (Total)', 'Halak (%)',
      'Kosher (Total)', 'Kosher (%)',
      'Rechazo (Total)', 'Rechazo (%)',
      'Total Registradas', '% Total',
      'Rechazo por cajón (Cant.)', 'Rechazo por cajón (%)',
      'Rechazo por livianos (Cant.)', 'Rechazo por livianos (%)',
      'Rechazo por pulmón roto (Cant.)', 'Rechazo por pulmón roto (%)',
      'Rechazo por pulmón (Cant.)', 'Rechazo por pulmón (%)'
    ];

    const lines = [header];
    rows.forEach((r) => {
      const c = extractRow(r);
      lines.push([
        c.fecha,
        c.total,
        c.halak, c.halak_pct.toFixed(2),
        c.kosher, c.kosher_pct.toFixed(2),
        c.rechazo, c.rechazo_pct.toFixed(2),
        c.registradas, c.pctTotal.toFixed(2),
        c.rcajon, c.rcajon_pct.toFixed(2),
        c.rliv, c.rliv_pct.toFixed(2),
        c.rpulRoto, c.rpulRoto_pct.toFixed(2),
        c.rpul, c.rpul_pct.toFixed(2)
      ]);
    });

    // CSV seguro
    return lines.map(row => row.map(v => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return s.match(/[",\n;]/) ? `"${s}"` : s;
    }).join(','))
    .join('\n');
  }

  async function onDownloadCsv() {
    const q = buildQueryParams();
    const url = `/api/faena/la-pampa?${q.toString()}`;
    showLoading(true);
    try {
      const resp = await fetch(url);
      const js   = await resp.json();
      const rows = Array.isArray(js?.rows) ? js.rows : [];
      const csv  = buildCsv(rows);

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'faena_la_pampa.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('[faena] Error al generar CSV', e);
    } finally {
      showLoading(false);
    }
  }

  function onApply() {
    fetchData();
    updateTitle();
  }

  function onClear() {
    goToLatestAndLoad();
    updateTitle();
  }

  // Eventos
  if (btnApply) btnApply.addEventListener('click', onApply);
  if (btnClear) btnClear.addEventListener('click', onClear);
  if (btnCsv)   btnCsv  .addEventListener('click', onDownloadCsv);

  // Actualizar título al cambiar frigorífico/cliente
  elFrig?.addEventListener('change', updateTitle);
  elCli?.addEventListener('change', updateTitle);

  // título inicial
  updateTitle();

  // Exponemos por si se necesita
  window.__faena = { fetchData, goToLatestAndLoad };
})();
