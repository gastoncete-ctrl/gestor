
/**
 * frontend_faena_pagination_v7_summary_apply.js
 *
 * - NO hace ninguna petición automática.
 * - Expone window.cargarDatosFaena(params) para que otros scripts (p.ej. el loader de filtros)
 *   soliciten los datos y pinten la tabla al presionar "Aplicar".
 * - Intenta usar una función global de render si existe (window.renderFaenaTable). Si no, hace
 *   un render mínimo en el primer <tbody> de la tabla principal.
 */
(function () {
  const API_BASE = '/api/faena/la-pampa';

  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

  async function fetchJSON(url) {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
    return await res.json();
  }

  function findTableBody() {
    // Si hubiera un tbody marcado explícitamente
    const known = $('#faenaTableBody') || $('tbody[data-role="faena-body"]');
    if (known) return known;

    // Si hay varias tablas, elegimos la que contenga el encabezado "Fecha de Faena"
    const tables = $all('table');
    for (const t of tables) {
      const hasHeader = !!Array.from(t.querySelectorAll('th')).find(th =>
        (th.textContent || '').toLowerCase().includes('fecha de faena')
      );
      if (hasHeader) return t.querySelector('tbody') || t;
    }

    // Fallback: primer tbody de la página
    return document.querySelector('tbody');
  }

  function formatPct(num) {
    if (!isFinite(num)) return '0.00%';
    return `${num.toFixed(2)}%`;
  }

  function clearTbody(tbody) {
    if (!tbody) return;
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
  }

  function makeCell(text) {
    const td = document.createElement('td');
    td.textContent = text == null ? '' : String(text);
    return td;
  }

  function minimalRender(items) {
    const tbody = findTableBody();
    if (!tbody) return;

    clearTbody(tbody);

    // Intentamos deducir columnas mínimas del payload
    for (const row of items) {
      const tr = document.createElement('tr');

      const total = Number(row['Total Animales'] ?? row['Total de Cabezas'] ?? row.total ?? 0);
      const halak = Number(row['Aptos Halak'] ?? row.halak ?? 0);
      const kosher = Number(row['Aptos Kosher'] ?? row.kosher ?? 0);
      const rechazo = Number(row['Rechazos'] ?? row.rechazo ?? 0);
      const fecha = row['Fecha Faena'] ?? row.Fecha ?? row.fecha ?? '';

      const pHalak = total ? (halak / total) * 100 : 0;
      const pKosher = total ? (kosher / total) * 100 : 0;
      const pRech = total ? (rechazo / total) * 100 : 0;

      tr.appendChild(makeCell(fecha));
      tr.appendChild(makeCell(total));         // Total de Cabezas
      tr.appendChild(makeCell(halak));         // Halak
      tr.appendChild(makeCell(formatPct(pHalak)));
      tr.appendChild(makeCell(kosher));        // Kosher
      tr.appendChild(makeCell(formatPct(pKosher)));
      tr.appendChild(makeCell(rechazo));       // Rechazo
      tr.appendChild(makeCell(formatPct(pRech)));
      tr.appendChild(makeCell(total));         // Total Registradas (aprox.)
      tr.appendChild(makeCell('100.00%'));     // % Total

      tbody.appendChild(tr);
    }
  }

  async function cargarDatosFaena(params = {}) {
    // Construimos query limpia (solo lo necesario)
    const q = new URLSearchParams();
    const allow = ['frigorifico', 'cliente', 'season_id', 'month', 'year', 'page', 'per_page', 'order'];
    for (const k of allow) {
      if (params[k] != null && params[k] !== '') q.set(k, params[k]);
    }
    // Defaults razonables para que el backend no limite de más
    if (!q.has('page')) q.set('page', '1');
    if (!q.has('per_page')) q.set('per_page', '1000');
    if (!q.has('order')) q.set('order', 'asc');

    const url = `${API_BASE}?${q.toString()}`;

    // Spinner simple en el botón aplicar si existe
    const btn = document.querySelector('#btnAplicar,[data-role="aplicar"]');
    const oldText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Cargando...'; }

    try {
      const data = await fetchJSON(url);
      const items = Array.isArray(data.items) ? data.items : (Array.isArray(data.rows) ? data.rows : []);

      if (typeof window.renderFaenaTable === 'function') {
        window.renderFaenaTable(items, data);
      } else {
        minimalRender(items);
      }

      // Si existen tarjetas de resumen arriba, intentamos pintarlas
      if (data.summary) {
        const t = n => Number(n || 0);
        const tot = t(data.summary.total);
        const hal = t(data.summary.halak);
        const kos = t(data.summary.kosher);
        const rec = t(data.summary.rechazo);

        const elTot = document.querySelector('[data-role="total-cabezas"]');
        const elHal = document.querySelector('[data-role="total-halak"]');
        const elKos = document.querySelector('[data-role="total-kosher"]');
        const elRec = document.querySelector('[data-role="total-rechazo"]');
        if (elTot) elTot.textContent = tot.toLocaleString('es-AR');
        if (elHal) elHal.textContent = `${hal.toLocaleString('es-AR')} - ${formatPct(tot ? (hal / tot) * 100 : 0)}`;
        if (elKos) elKos.textContent = `${kos.toLocaleString('es-AR')} - ${formatPct(tot ? (kos / tot) * 100 : 0)}`;
        if (elRec) elRec.textContent = `${rec.toLocaleString('es-AR')} - ${formatPct(tot ? (rec / tot) * 100 : 0)}`;
      }

    } catch (err) {
      console.error('cargarDatosFaena error', err);
      alert('No se pudieron cargar los datos.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = oldText || 'Aplicar'; }
    }
  }

  // Exponer la función globalmente
  window.cargarDatosFaena = cargarDatosFaena;
})();
