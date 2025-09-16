(() => {
  const API = '/api/faena/la-pampa';

  let page    = 1;
  let perPage = 10;
  let order   = 'asc';
  let filters = {};  // {frigorifico, cliente, season_id, month, year}

  // DOM
  const $sumTotal  = document.querySelector('#sum-total');
  const $sumHalak  = document.querySelector('#sum-halak');
  const $sumKosher = document.querySelector('#sum-kosher');
  const $sumRech   = document.querySelector('#sum-rechazo');
  const $tbody     = document.querySelector('#faena-table-body');
  const $pager     = document.querySelector('#faena-pager');

  const n   = (v) => (typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')) || 0);
  const pct = (x, t) => (t ? (x / t * 100) : 0);

  function renderSummary(summary) {
    if (!summary) {
      if ($sumTotal)  $sumTotal.textContent  = '0 - 100%';
      if ($sumHalak)  $sumHalak.textContent  = '0 - 0%';
      if ($sumKosher) $sumKosher.textContent = '0 - 0%';
      if ($sumRech)   $sumRech.textContent   = '0 - 0%';
      return;
    }
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
    if ($tbody) $tbody.innerHTML = '';
    if (!Array.isArray(rows)) return;

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
        <td>${pct(halak, total).toFixed(2)}%</td>

        <td>${kosher}</td>
        <td>${pct(kosher, total).toFixed(2)}%</td>

        <td>${rech}</td>
        <td>${pct(rech, total).toFixed(2)}%</td>

        <td>${total}</td>
        <td>100.00%</td>

        <td>${cajon}</td>
        <td>${pct(cajon, total).toFixed(2)}%</td>

        <td>${liv}</td>
        <td>${pct(liv, total).toFixed(2)}%</td>

        <td>${pulmR}</td>
        <td>${pct(pulmR, total).toFixed(2)}%</td>

        <td>${pulm}</td>
        <td>${pct(pulm, total).toFixed(2)}%</td>
      `;
      $tbody.appendChild(tr);
    }
  }

  function renderPager(totalPages) {
    if (!$pager) return;

    const makeBtn = (label, targetPage, disabled=false, strong=false) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.disabled = disabled;
      b.style.padding = '6px 10px';
      b.style.borderRadius = '6px';
      b.style.border = '1px solid #ddd';
      b.style.background = strong ? '#e9ecef' : '#fff';
      b.addEventListener('click', () => {
        if (!disabled && targetPage !== page) {
          page = targetPage;
          loadPage();
        }
      });
      return b;
    };

    const windowSize = 5;
    let start = Math.max(1, page - Math.floor(windowSize/2));
    let end   = Math.min(totalPages, start + windowSize - 1);
    start     = Math.max(1, Math.min(start, end - windowSize + 1));

    $pager.innerHTML = '';
    $pager.appendChild(makeBtn('«', 1, page === 1));
    $pager.appendChild(makeBtn('‹', Math.max(1, page - 1), page === 1));

    for (let p = start; p <= end; p++) {
      $pager.appendChild(makeBtn(String(p), p, false, p === page));
    }

    $pager.appendChild(makeBtn('›', Math.min(totalPages, page + 1), page === totalPages));
    $pager.appendChild(makeBtn('»', totalPages, page === totalPages));

    const sel = document.createElement('select');
    sel.style.marginLeft = '8px';
    [10, 25, 50, 100, 250, 500].forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = `Filas: ${v}`;
      if (v === perPage) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
      perPage = parseInt(sel.value, 10) || 10;
      page = 1;
      loadPage();
    });
    $pager.appendChild(sel);
  }

  async function loadPage() {
    try {
      // Armo querystring con filtros + paginación
      const qs = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        order
      });

      ['frigorifico','cliente','season_id','month','year'].forEach(k => {
        const v = filters[k];
        if (v !== undefined && v !== null && v !== '' && !Number.isNaN(+v)) {
          qs.set(k, String(+v));
        }
      });

      const res = await fetch(`${API}?${qs.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      renderSummary(data.summary || null);
      renderTable(Array.isArray(data.items) ? data.items : []);
      renderPager(data.total_pages || 1);
    } catch (err) {
      console.error('Error al cargar página:', err);
      alert('No se pudieron cargar los datos de la tabla.');
    }
  }

  // API pública para otros scripts (botón "Aplicar")
  window.cargarDatosFaena = (f = {}) => {
    // normalizo filtros
    const tmp = {};
    ['frigorifico','cliente','season_id','month','year'].forEach(k => {
      const v = f[k];
      if (v !== undefined && v !== null && v !== '' && !Number.isNaN(+v)) {
        tmp[k] = +v;
      }
    });
    filters = tmp;
    page = 1;
    loadPage();
  };

  // API para limpiar tabla cuando se cambien combos
  window.resetTablaFaena = () => {
    renderSummary(null);
    if ($tbody) $tbody.innerHTML = '';
    if ($pager) $pager.innerHTML = '';
  };

  // NO cargamos datos al inicio: la tabla queda vacía hasta que el usuario apriete "Aplicar".
  document.addEventListener('DOMContentLoaded', () => {
    renderSummary(null);
    if ($tbody) $tbody.innerHTML = '';
    if ($pager) $pager.innerHTML = '';
  });
})();