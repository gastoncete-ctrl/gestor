// /static/frigorifico_only_boot.js
(() => {
  const API_BASE = '/api/faena/la-pampa';

  // DOM
  const $selFrig = document.getElementById('selFrigorifico');
  const $tbody   = document.getElementById('faena-table-body');

  const $sumTotal  = document.getElementById('sum-total');
  const $sumHalak  = document.getElementById('sum-halak');
  const $sumKosher = document.getElementById('sum-kosher');
  const $sumRech   = document.getElementById('sum-rechazo');

  // Helpers
  const n = (v) => (typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')) || 0);
  const pct = (x, t) => (t ? (x / t * 100) : 0);

  function clearTableAndSummary() {
    if ($tbody) $tbody.innerHTML = '';
    if ($sumTotal)  $sumTotal.textContent  = '0 - 100%';
    if ($sumHalak)  $sumHalak.textContent  = '0 - 0%';
    if ($sumKosher) $sumKosher.textContent = '0 - 0%';
    if ($sumRech)   $sumRech.textContent   = '0 - 0%';
  }

  function normalize(data) {
    // La API puede responder array o {rows:[...]}
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.rows)) return data.rows;
    return data;
  }

  async function cargarFrigorificos() {
    try {
      const res = await fetch(`${API_BASE}/frigorificos`, { cache: 'no-store' });
      const data = normalize(await res.json()) || [];
      // Opciones
      $selFrig.innerHTML = '';
      const opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = '— Seleccionar frigorífico —';
      $selFrig.appendChild(opt0);

      for (const r of data) {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.label || r.nombre || String(r.id);
        $selFrig.appendChild(opt);
      }
    } catch (e) {
      console.error('Error cargando frigoríficos', e);
      $selFrig.innerHTML = '<option value="">(sin datos)</option>';
    }
  }

  function renderSummary(summary) {
    if (!summary) return clearTableAndSummary();

    const T = n(summary.total);
    const H = n(summary.halak);
    const K = n(summary.kosher);
    const R = n(summary.rechazo);

    if ($sumTotal)  $sumTotal.textContent  = `${Math.round(T).toLocaleString('es-AR')} - 100%`;
    if ($sumHalak)  $sumHalak.textContent  = `${Math.round(H).toLocaleString('es-AR')} - ${pct(H, T).toFixed(2)}%`;
    if ($sumKosher) $sumKosher.textContent = `${Math.round(K).toLocaleString('es-AR')} - ${pct(K, T).toFixed(2)}%`;
    if ($sumRech)   $sumRech.textContent   = `${Math.round(R).toLocaleString('es-AR')} - ${pct(R, T).toFixed(2)}%`;
  }

  function renderTable(rows) {
    $tbody.innerHTML = '';
    for (const item of rows) {
      const fecha   = item['Fecha Faena'] || item['FechaISO'] || '';
      const total   = n(item['Total de Cabezas'] ?? item['Total Animales']);
      const halak   = n(item['Aptos Halak']);
      const kosher  = n(item['Aptos Kosher']);
      const rech    = n(item['Rechazos']);
      const cajon   = n(item['Rechazo por cajon']);
      const liv     = n(item['Rechazo por Livianos']);
      const pulmR   = n(item['Rechazo por Pulmon roto']);
      const pulm    = n(item['Rechazo por Pulmon']);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fecha}</td>
        <td>${total}</td>

        <td>${halak}</td>
        <td>${(pct(halak, total)).toFixed(2)}%</td>

        <td>${kosher}</td>
        <td>${(pct(kosher, total)).toFixed(2)}%</td>

        <td>${rech}</td>
        <td>${(pct(rech, total)).toFixed(2)}%</td>

        <td>${total}</td>
        <td>100.00%</td>

        <td>${cajon}</td>
        <td>${(pct(cajon, total)).toFixed(2)}%</td>

        <td>${liv}</td>
        <td>${(pct(liv, total)).toFixed(2)}%</td>

        <td>${pulmR}</td>
        <td>${(pct(pulmR, total)).toFixed(2)}%</td>

        <td>${pulm}</td>
        <td>${(pct(pulm, total)).toFixed(2)}%</td>
      `;
      $tbody.appendChild(tr);
    }
  }

  async function cargarDatosDeFrigorifico(frigId) {
    if (!frigId) {
      clearTableAndSummary();
      return;
    }
    try {
      // aún sin paginación: pedimos “muchas” filas
      const url = `${API_BASE}?frigorifico=${encodeURIComponent(frigId)}&order=asc&per_page=1000&page=1`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      renderSummary(data.summary || null);
      renderTable(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error('Error cargando datos del frigorífico', e);
      clearTableAndSummary();
      alert('No se pudieron cargar los datos del frigorífico seleccionado.');
    }
  }

  // --- inicio ---
  document.addEventListener('DOMContentLoaded', async () => {
    clearTableAndSummary();       // tabla vacía al inicio
    await cargarFrigorificos();   // llena el combo

    $selFrig.addEventListener('change', () => {
      const id = $selFrig.value;
      cargarDatosDeFrigorifico(id);
    });
  });
})();