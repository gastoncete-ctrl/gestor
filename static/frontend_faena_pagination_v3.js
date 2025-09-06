
(function () {
  // ---- DOM refs (ids deben existir en tu HTML) ----
  const tableBody    = document.getElementById('faena-table-body');
  const seasonSelect = document.getElementById('filter-season');   // <select>
  const monthSelect  = document.getElementById('filter-month');    // <select>
  const yearInput    = document.getElementById('filter-year');     // <input or <select>
  const applyBtn     = document.getElementById('apply-filter');    // botón "Aplicar" (opcional)
  const clearBtn     = document.getElementById('clear-filter');    // botón "Limpiar" (opcional)

  // ---- Estado de paginación ----
  let currentPage  = 1;
  let perPage      = 10;   // default
  let totalPages   = 1;
  let totalCount   = 0;
  let currentOrder = 'asc';  // 'asc' | 'desc'

  // ---- Persistencia de "filas por página" ----
  (function initPerPage() {
    const saved = localStorage.getItem('faena_per_page');
    if (saved) {
      const n = parseInt(saved, 10);
      if (!isNaN(n) && n > 0 && n <= 500) perPage = n;
    } else {
      const ans = prompt('¿Cuántas filas por página? (10/25/50/100)', '10');
      const n = parseInt(ans || '10', 10);
      perPage = (!isNaN(n) && n > 0 && n <= 500) ? n : 10;
      localStorage.setItem('faena_per_page', String(perPage));
    }
  })();

  // ---- Spinner + Paginador (estilo pill) ----
  (function ensureUI() {
    const css = `
#loading-overlay{position:fixed;inset:0;background:rgba(255,255,255,.55);backdrop-filter:saturate(120%) blur(2px);display:none;align-items:center;justify-content:center;z-index:9999}
#loading-overlay.show{display:flex}
#loading-overlay .spinner{width:44px;height:44px;border:3px solid #e6e6e6;border-top-color:#0d6efd;border-radius:50%;animation:spin .9s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
#pager{display:flex;gap:8px;align-items:center;justify-content:center;margin:16px 0}
.pill{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid #e5e7eb;border-radius:9999px;box-shadow:0 1px 2px rgba(16,24,40,.08);padding:6px 10px;}
.pill button{border:none;background:transparent;padding:6px 10px;border-radius:9999px;cursor:pointer}
.pill button:hover{background:#f3f4f6}
.pill button:disabled{opacity:.4;cursor:not-allowed}
.pill .num{min-width:160px;text-align:center;font-weight:600}
.pill .sep{opacity:.4}
.pager-size{margin-left:10px;padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#fff}
    `;
    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.setAttribute('aria-hidden','true');
      overlay.innerHTML = '<div class="spinner" aria-label="Cargando"></div>';
      document.body.appendChild(overlay);
    }

    let container = document.getElementById('pager');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pager';
      const parent = tableBody?.parentElement?.parentElement || document.body;
      parent.appendChild(container);
    }
    container.innerHTML = '';
    const pill = document.createElement('div');
    pill.className = 'pill';
    pill.innerHTML = `
      <button id="pg-first" title="Primera">«</button>
      <button id="pg-prev"  title="Anterior">‹</button>
      <span class="num" id="pg-info">Página 1 de 1 (0)</span>
      <button id="pg-next"  title="Siguiente">›</button>
      <button id="pg-last"  title="Última">»</button>
      <span class="sep">|</span>
      <label for="pg-size" style="font-size:12px;opacity:.8">Filas:</label>
      <select id="pg-size" class="pager-size">
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>
    `;
    container.appendChild(pill);
    const sizeSel = pill.querySelector('#pg-size');
    sizeSel.value = String(perPage);
    sizeSel.addEventListener('change', () => {
      perPage = parseInt(sizeSel.value, 10) || 10;
      localStorage.setItem('faena_per_page', String(perPage));
      currentPage = 1; triggerLoad();
    });

    pill.querySelector('#pg-first').addEventListener('click', () => { if (currentPage>1){ currentPage=1; triggerLoad(); } });
    pill.querySelector('#pg-prev').addEventListener('click',  () => { if (currentPage>1){ currentPage--; triggerLoad(); } });
    pill.querySelector('#pg-next').addEventListener('click',  () => { if (currentPage<totalPages){ currentPage++; triggerLoad(); } });
    pill.querySelector('#pg-last').addEventListener('click',  () => { if (currentPage<totalPages){ currentPage=totalPages; triggerLoad(); } });
  })();

  const showLoading = () => document.getElementById('loading-overlay')?.classList.add('show');
  const hideLoading = () => document.getElementById('loading-overlay')?.classList.remove('show');

  const pct = (n, d) => d > 0 ? ((n / d) * 100).toFixed(2) : '0.00';
  const clampMonth = (m) => Math.min(12, Math.max(1, Number(m)||0));
  const toDDMMYYYY = (s) => (String(s).match(/^(\\d{4})-(\\d{2})-(\\d{2})/) ? RegExp.$3+'-'+RegExp.$2+'-'+RegExp.$1 : String(s||''));

  // ---- Render tabla ----
  function renderizarTabla(rows){
    tableBody.innerHTML = '';
    rows.forEach(item => {
      const total  = Number(item['Total Animales']) || 0;
      const halak  = Number(item['Aptos Halak']) || 0;
      const kosher = Number(item['Aptos Kosher']) || 0;
      const rech   = Number(item['Rechazos']) || 0;
      const totReg = halak + kosher + rech;
      const rcaj = Number(item['Rechazo por cajon']) || 0;
      const rliv = Number(item['Rechazo por Livianos']) || 0;
      const rpro = Number(item['Rechazo por Pulmon roto']) || 0;
      const rpul = Number(item['Rechazo por Pulmon']) || 0;
      const fecha = item['Fecha Faena'] || toDDMMYYYY(item['FechaISO']);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fecha}</td>
        <td>${total}</td>
        <td>${halak}</td>
        <td>${pct(halak, total)}%</td>
        <td>${kosher}</td>
        <td>${pct(kosher, total)}%</td>
        <td>${rech}</td>
        <td>${pct(rech, total)}%</td>
        <td>${totReg}</td>
        <td>${pct(totReg, total)}%</td>
        <td>${rcaj}</td>
        <td>${pct(rcaj, total)}%</td>
        <td>${rliv}</td>
        <td>${pct(rliv, total)}%</td>
        <td>${rpro}</td>
        <td>${pct(rpro, total)}%</td>
        <td>${rpul}</td>
        <td>${pct(rpul, total)}%</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // ---- Cargar temporadas y poblar el <select> ----
  async function cargarTemporadas(){
    if (!seasonSelect) return null;
    showLoading();
    try{
      const r = await fetch('/api/faena/la-pampa/temporadas');
      if (!r.ok) throw new Error('No se pudieron cargar las temporadas');
      const payload = await r.json();
      const currentId   = payload.current_id || null;
      const temporadas  = payload.temporadas || [];

      // Popular opciones
      seasonSelect.innerHTML = '<option value="">-- Seleccionar temporada --</option>';
      for (const t of temporadas) {
        const opt = document.createElement('option');
        opt.value = String(t.id);
        opt.textContent = t.label;
        seasonSelect.appendChild(opt);
      }
      if (currentId) seasonSelect.value = String(currentId);
      return currentId;
    }catch(e){
      console.error(e);
      return null;
    }finally{
      hideLoading();
    }
  }

  // ---- Estado actual de filtros ----
  function currentFilter() {
    const sid = seasonSelect ? parseInt(seasonSelect.value || '0', 10) || null : null;
    const m   = monthSelect ? parseInt(monthSelect.value || '0', 10) || null : null;
    const y   = yearInput   ? parseInt(yearInput.value   || '0', 10) || null : null;
    return { sid, m, y };
  }

  // ---- Cargar datos (API) ----
  async function cargarDatos({month=null, year=null, seasonId=null, page=1, order='asc'} = {}){
    let url = '/api/faena/la-pampa';
    const params = new URLSearchParams();
    if (seasonId) params.set('season_id', seasonId);
    else if (month && year) { params.set('month', month); params.set('year', year); }
    params.set('page', page);
    params.set('per_page', perPage);
    params.set('order', order);
    url += `?${params.toString()}`;

    showLoading();
    try{
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = await resp.json();
      const rows = payload.items || [];
      totalPages  = payload.total_pages || 1;
      totalCount  = payload.total || rows.length;
      currentOrder = (payload.order || 'ASC').toString().toLowerCase();

      renderizarTabla(rows);
      updatePager();
    }catch(e){
      console.error(e);
      alert('Ocurrió un error al cargar los datos de faena.');
    }finally{
      hideLoading();
    }
  }

  // ---- Paginador: refresco de estado ----
  function updatePager() {
    const info = document.getElementById('pg-info');
    if (info) info.textContent = `Página ${currentPage} de ${totalPages} (${totalCount} filas)`;
    ['pg-first','pg-prev'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = currentPage <= 1;
    });
    ['pg-next','pg-last'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = currentPage >= totalPages;
    });
  }

  // ---- Disparar carga con filtros actuales ----
  function triggerLoad() {
    const {sid, m, y} = currentFilter();
    cargarDatos({ seasonId: sid || undefined, month: m || undefined, year: y || undefined, page: currentPage, order: currentOrder });
  }

  // ---- Listeners de filtros ----
  if (seasonSelect) seasonSelect.addEventListener('change', () => {
    // Al elegir temporada, limpiamos mes/año para evitar conflictos
    if (monthSelect) monthSelect.value = '';
    if (yearInput)  yearInput.value = '';
    currentPage = 1; currentOrder = 'asc';
    triggerLoad();
  });

  if (monthSelect) monthSelect.addEventListener('change', () => {
    // Si se elige mes/año, limpiamos temporada
    if (seasonSelect) seasonSelect.value = '';
    const m = parseInt(monthSelect.value || '0', 10);
    const y = (yearInput && parseInt(yearInput.value || '0', 10)) || null;
    if (m && y) { currentPage = 1; currentOrder = 'asc'; triggerLoad(); }
  });

  if (yearInput) {
    const applyYearChange = () => {
      if (seasonSelect) seasonSelect.value = '';
      const y = parseInt(yearInput.value || '0', 10);
      const m = monthSelect ? parseInt(monthSelect.value || '0', 10) : 0;
      if (m && y) { currentPage = 1; currentOrder = 'asc'; triggerLoad(); }
    };
    yearInput.addEventListener('change', applyYearChange);
    yearInput.addEventListener('blur', applyYearChange);
    yearInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') applyYearChange(); });
  }

  // Botón "Aplicar" (si existe en tu HTML)
  if (applyBtn) applyBtn.addEventListener('click', () => { currentPage = 1; currentOrder = 'asc'; triggerLoad(); });
  // Botón "Limpiar" (si existe en tu HTML)
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (seasonSelect) seasonSelect.value = '';
    if (monthSelect)  monthSelect.value  = '';
    if (yearInput)    yearInput.value    = '';
    currentPage = 1; currentOrder = 'asc';
    triggerLoad();
  });

  // ---- Inicio: cargar temporadas y primer juego de datos ----
  document.addEventListener('DOMContentLoaded', async () => {
    // 1) Intentamos poblar temporadas
    const currentSeasonId = await cargarTemporadas();
    currentPage = 1; currentOrder = 'asc';

    if (currentSeasonId) {
      // Si hay temporada actual, la usamos
      triggerLoad();
    } else {
      // Si no hay temporadas, caemos a mes/año actual
      const now = new Date();
      if (monthSelect) monthSelect.value = String(now.getMonth() + 1);
      if (yearInput)   yearInput.value   = String(now.getFullYear());
      triggerLoad();
    }
  });

})();