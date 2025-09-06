
(function () {
  const tableBody    = document.getElementById('faena-table-body');
  const seasonSelect = document.getElementById('filter-season');
  const monthSelect  = document.getElementById('filter-month');
  const yearSelect   = document.getElementById('filter-year');
  const applyBtn     = document.getElementById('apply-filter');
  const clearBtn     = document.getElementById('clear-filter');

  let currentPage  = 1;
  let perPage      = 10;
  let totalPages   = 1;
  let totalCount   = 0;
  let currentOrder = 'asc';

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

  (function ensureUI(){
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
    pill.querySelector('#pg-prev').addEventListener('click', () =>  { if (currentPage>1){ currentPage--; triggerLoad(); } });
    pill.querySelector('#pg-next').addEventListener('click', () =>  { if (currentPage<totalPages){ currentPage++; triggerLoad(); } });
    pill.querySelector('#pg-last').addEventListener('click', () =>  { if (currentPage<totalPages){ currentPage=totalPages; triggerLoad(); } });
  })();

  const showLoading = () => document.getElementById('loading-overlay')?.classList.add('show');
  const hideLoading = () => document.getElementById('loading-overlay')?.classList.remove('show');

  const toDDMMYYYY = (s) => (String(s).match(/^(\d{4})-(\d{2})-(\d{2})/) ? RegExp.$3+'-'+RegExp.$2+'-'+RegExp.$1 : String(s||''));

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
      const pct = (n) => (n && total ? (n/total*100).toFixed(2) : '0.00');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fecha}</td>
        <td>${total}</td>
        <td>${halak}</td>
        <td>${pct(halak)}%</td>
        <td>${kosher}</td>
        <td>${pct(kosher)}%</td>
        <td>${rech}</td>
        <td>${pct(rech)}%</td>
        <td>${totReg}</td>
        <td>${pct(totReg)}%</td>
        <td>${rcaj}</td>
        <td>${pct(rcaj)}%</td>
        <td>${rliv}</td>
        <td>${pct(rliv)}%</td>
        <td>${rpro}</td>
        <td>${pct(rpro)}%</td>
        <td>${rpul}</td>
        <td>${pct(rpul)}%</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  async function cargarTemporadas(){
    if (!seasonSelect) return null;
    try{
      const r = await fetch('/api/faena/la-pampa/temporadas');
      if (!r.ok) throw new Error('No se pudieron cargar las temporadas');
      const { current_id, temporadas } = await r.json();
      seasonSelect.innerHTML = '<option value="">-- Seleccionar temporada --</option>';
      (temporadas || []).forEach(t => {
        const opt = document.createElement('option');
        opt.value = String(t.id);
        opt.textContent = t.label;
        seasonSelect.appendChild(opt);
      });
      return current_id || null;
    } catch(e){
      console.error(e);
      return null;
    }
  }

  async function cargarAniosParaMes(month) {
    if (!yearSelect) return [];
    yearSelect.disabled = true;
    yearSelect.innerHTML = '<option value="">Año</option>';
    if (!month) return [];
    try{
      const r = await fetch(`/api/faena/la-pampa/years?month=${encodeURIComponent(month)}`);
      if (!r.ok) throw new Error('No se pudieron cargar los años');
      const { years } = await r.json();
      (years || []).forEach(y => {
        const opt = document.createElement('option');
        opt.value = String(y);
        opt.textContent = String(y);
        yearSelect.appendChild(opt);
      });
      yearSelect.disabled = false;
      return years || [];
    }catch(e){
      console.error(e);
      return [];
    }
  }

  function currentFilter() {
    const sid = seasonSelect ? parseInt(seasonSelect.value || '0', 10) || null : null;
    const m   = monthSelect ? parseInt(monthSelect.value || '0', 10) || null : null;
    const y   = yearSelect  ? parseInt(yearSelect.value  || '0', 10) || null : null;
    return { sid, m, y };
  }

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
      const appliedYear  = parseInt(resp.headers.get('X-Applied-Year')  || '', 10);
      const appliedMonth = parseInt(resp.headers.get('X-Applied-Month') || '', 10);

      const payload = await resp.json();
      const rows = payload.items || [];
      totalPages  = payload.total_pages || 1;
      totalCount  = payload.total || rows.length;
      currentOrder = (payload.order || 'ASC').toString().toLowerCase();
      renderizarTabla(rows);
      updatePager();

      if (!seasonId && !month && !year && !isNaN(appliedYear) && !isNaN(appliedMonth)) {
        if (monthSelect) monthSelect.value = String(appliedMonth);
        if (yearSelect) {
          const ys = await cargarAniosParaMes(appliedMonth);
          if (ys.length) yearSelect.value = String(appliedYear);
        }
      }
    }catch(e){
      console.error(e);
      alert('Ocurrió un error al cargar los datos de faena.');
    }finally{
      hideLoading();
    }
  }

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

  function triggerLoad() {
    const {sid, m, y} = currentFilter();
    cargarDatos({ seasonId: sid || undefined, month: m || undefined, year: y || undefined, page: currentPage, order: currentOrder });
  }

  if (seasonSelect) seasonSelect.addEventListener('change', () => {
    if (monthSelect) monthSelect.value = '';
    if (yearSelect) { yearSelect.innerHTML = '<option value="">Año</option>'; yearSelect.disabled = true; }
    currentPage = 1; currentOrder = 'asc'; triggerLoad();
  });

  if (monthSelect) monthSelect.addEventListener('change', async () => {
    if (seasonSelect) seasonSelect.value = '';
    const m = parseInt(monthSelect.value || '0', 10);
    if (!m) { if (yearSelect){ yearSelect.innerHTML = '<option value="">Año</option>'; yearSelect.disabled = true; } return; }
    const years = await cargarAniosParaMes(m);
    if (!years.length) return;
    if (yearSelect && !yearSelect.value) yearSelect.value = String(years[0]);
    currentPage = 1; currentOrder = 'asc'; triggerLoad();
  });

  if (yearSelect) yearSelect.addEventListener('change', () => {
    if (seasonSelect) seasonSelect.value = '';
    const m = parseInt(monthSelect?.value || '0', 10);
    const y = parseInt(yearSelect.value || '0', 10);
    if (m && y) { currentPage = 1; currentOrder = 'asc'; triggerLoad(); }
  });

  if (applyBtn) applyBtn.addEventListener('click', () => { currentPage = 1; currentOrder = 'asc'; triggerLoad(); });
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (seasonSelect) seasonSelect.value = '';
    if (monthSelect)  monthSelect.value  = '';
    if (yearSelect)  { yearSelect.innerHTML = '<option value="">Año</option>'; yearSelect.disabled = true; }
    currentPage = 1; currentOrder = 'asc'; triggerLoad();
  });

  document.addEventListener('DOMContentLoaded', async () => {
    // asegurar meses si viniera vacío en el HTML
    if (monthSelect && (!monthSelect.options || monthSelect.options.length <= 1)) {
      const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      if (!monthSelect.options.length) {
        const ph = document.createElement('option'); ph.value=''; ph.textContent='--Seleccionar Mes--'; monthSelect.appendChild(ph);
      }
      if (monthSelect.options.length <= 1) {
        months.forEach((name, idx) => {
          const opt = document.createElement('option');
          opt.value = String(idx + 1);
          opt.textContent = name;
          monthSelect.appendChild(opt);
        });
      }
    }

    await cargarTemporadas();
    currentPage = 1; currentOrder = 'asc';
    await cargarDatos({});
  });
})();