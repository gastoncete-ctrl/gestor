
/**
 * frontend_faena_pagination_v7_summary_apply2.js
 * - Expone window.cargarDatosFaena(params) y pinta una tabla básica.
 * - No hace nada automático: sólo cuando se la invoca (usado por el botón "Aplicar").
 */

(function () {
  function $(sel) { return document.querySelector(sel); }

  // Localiza el tbody de la tabla principal (adaptable si tenés un id concreto).
  function findTBody() {
    return $('#faenaTable tbody') || document.querySelector('table tbody');
  }

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s);
  }

  async function cargarDatosFaena(params) {
    // params: {frigorifico, cliente, season_id?} | {frigorifico, cliente, month, year}
    const qs = new URLSearchParams();
    if (params.frigorifico) qs.set('frigorifico', String(params.frigorifico));
    if (params.cliente) qs.set('cliente', String(params.cliente));
    if (params.season_id) qs.set('season_id', String(params.season_id));
    if (params.month) qs.set('month', String(params.month));
    if (params.year) qs.set('year', String(params.year));
    qs.set('page', '1');
    qs.set('per_page', '500'); // mostrará abundante; luego paginás si querés
    qs.set('order', 'asc');

    const url = `/api/faena/la-pampa?${qs.toString()}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const items = data.items || data.rows || [];
      const tbody = findTBody();
      if (!tbody) {
        console.warn('No encontré <tbody> para renderizar.');
        return;
      }

      // Render mínimo compatible con tus columnas más comunes
      tbody.innerHTML = items.map(r => {
        const fecha = r['Fecha Faena'] || r['Fecha'] || r['FechaISO'] || '';
        const total = r['Total Animales'] ?? r['Total de Cabezas'] ?? r['total'] ?? '';
        const h = r['Aptos Halak'] ?? r['Halak'] ?? '';
        const k = r['Aptos Kosher'] ?? r['Kosher'] ?? '';
        const rech = r['Rechazos'] ?? r['Rechazo'] ?? '';
        return `<tr>
          <td>${esc(fecha)}</td>
          <td>${esc(total)}</td>
          <td>${esc(h)}</td>
          <td></td>
          <td>${esc(k)}</td>
          <td></td>
          <td>${esc(rech)}</td>
          <td></td>
          <td>${esc(total)}</td>
          <td>100.00%</td>
        </tr>`;
      }).join('');

      // Tarjetas (opcional)
      const summary = data.summary || {};
      const tot = summary.total ?? null;
      const th = summary.halak ?? null;
      const tk = summary.kosher ?? null;
      const tr = summary.rechazo ?? null;

      const elTot = document.querySelector('[data-role="total-cabezas"]');
      const elHal = document.querySelector('[data-role="total-halak"]');
      const elKos = document.querySelector('[data-role="total-kosher"]');
      const elRec = document.querySelector('[data-role="total-rechazo"]');

      if (elTot && tot != null) elTot.textContent = tot;
      if (elHal && th != null) elHal.textContent = th;
      if (elKos && tk != null) elKos.textContent = tk;
      if (elRec && tr != null) elRec.textContent = tr;
    } catch (err) {
      console.error('cargarDatosFaena error:', err);
      alert('No se pudieron cargar los datos.');
    }
  }

  // Exponer a window
  window.cargarDatosFaena = cargarDatosFaena;
})();
