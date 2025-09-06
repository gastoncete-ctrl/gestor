
(function () {
  const tableBody    = document.getElementById('faena-table-body');
  const seasonSelect = document.getElementById('filter-season');
  const monthSelect  = document.getElementById('filter-month');
  const yearInput    = document.getElementById('filter-year');

  let currentPage = 1;
  let perPage     = 100;
  let totalPages  = 1;
  let totalCount  = 0;

  function ensurePager() {
    let container = document.getElementById('pager');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pager';
      container.style.display = 'flex';
      container.style.gap = '8px';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'flex-end';
      container.style.margin = '12px 0';
      const parent = tableBody?.parentElement?.parentElement || document.body;
      parent.appendChild(container);
    }
    if (!document.getElementById('pager-prev')) {
      const btnPrev = document.createElement('button');
      btnPrev.id = 'pager-prev'; btnPrev.textContent = '← Anterior';
      btnPrev.className = 'btn btn-light'; btnPrev.disabled = true;
      container.appendChild(btnPrev);
    }
    if (!document.getElementById('pager-info')) {
      const info = document.createElement('span');
      info.id = 'pager-info';
      info.style.minWidth = '160px';
      info.style.textAlign = 'center';
      container.appendChild(info);
    }
    if (!document.getElementById('pager-next')) {
      const btnNext = document.createElement('button');
      btnNext.id = 'pager-next'; btnNext.textContent = 'Siguiente →';
      btnNext.className = 'btn btn-light'; btnNext.disabled = true;
      container.appendChild(btnNext);
    }
  }
  ensurePager();

  function updatePager() {
    const info = document.getElementById('pager-info');
    const prev = document.getElementById('pager-prev');
    const next = document.getElementById('pager-next');
    if (info) info.textContent = `Página ${currentPage} de ${totalPages} (${totalCount} filas)`;
    if (prev) prev.disabled = currentPage <= 1;
    if (next) next.disabled = currentPage >= totalPages;
  }

  (function ensureSpinner() {
    const css = `
#loading-overlay{position:fixed;inset:0;background:rgba(255,255,255,.55);backdrop-filter:saturate(120%) blur(2px);display:none;align-items:center;justify-content:center;z-index:9999}
#loading-overlay.show{display:flex}
#loading-overlay .spinner{width:44px;height:44px;border:3px solid #e6e6e6;border-top-color:#0d6efd;border-radius:50%;animation:spin .9s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
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
  })();
  const showLoading = () => document.getElementById('loading-overlay')?.classList.add('show');
  const hideLoading = () => document.getElementById('loading-overlay')?.classList.remove('show');

  const pct = (n, d) => d > 0 ? ((n / d) * 100).toFixed(2) : '0.00';
  const clampMonth = (m) => Math.min(12, Math.max(1, Number(m)||0));
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

  async function cargarDatos({month=null, year=null, seasonId=null, page=1} = {}){
    let url = '/api/faena/la-pampa';
    const params = new URLSearchParams();
    if (seasonId) params.set('season_id', seasonId);
    else if (month && year) { params.set('month', month); params.set('year', year); }
    params.set('page', page);
    params.set('per_page', perPage);
    url += `?${params.toString()}`;

    showLoading();
    try{
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = await resp.json();

      const rows = Array.isArray(payload) ? payload : (payload.items || []);
      totalPages = Array.isArray(payload) ? 1 : (payload.total_pages || 1);
      totalCount = Array.isArray(payload) ? rows.length : (payload.total || parseInt(resp.headers.get('X-Total-Count') || '0', 10));

      renderizarTabla(rows);
      updatePager();
    }catch(e){
      console.error(e);
      alert('Ocurrió un error al cargar los datos de faena.');
    }finally{
      hideLoading();
    }
  }

  async function cargarTemporadas(){
    if (!seasonSelect) return null;
    showLoading();
    try{
      const r = await fetch('/api/faena/la-pampa/temporadas');
      if (!r.ok) throw new Error('No se pudieron cargar las temporadas');
      const { current_id, temporadas } = await r.json();
      seasonSelect.innerHTML = '<option value="">-- Seleccionar temporada --</option>';
      for (const t of temporadas) {
        const opt = document.createElement('option');
        opt.value = String(t.id);
        opt.textContent = t.label;
        seasonSelect.appendChild(opt);
      }
      if (current_id) seasonSelect.value = String(current_id);
      return current_id;
    } catch(e){
      console.error(e);
      return null;
    } finally {
      hideLoading();
    }
  }

  if (seasonSelect) seasonSelect.addEventListener('change', () => {
    const sid = parseInt(seasonSelect.value, 10);
    currentPage = 1;
    if (sid) {
      if (monthSelect) monthSelect.value = '';
      if (yearInput) yearInput.value = '';
      cargarDatos({ seasonId: sid, page: currentPage });
    }
  });

  if (monthSelect) monthSelect.addEventListener('change', () => {
    const m = clampMonth(parseInt(monthSelect.value, 10));
    const y = (yearInput && parseInt(yearInput.value, 10)) || (new Date()).getFullYear();
    currentPage = 1;
    if (m && y) {
      if (seasonSelect) seasonSelect.value = '';
      cargarDatos({ month: m, year: y, page: currentPage });
    }
  });

  if (yearInput) {
    const applyYearChange = () => {
      let y = parseInt(yearInput.value.trim(), 10);
      if (isNaN(y)) return;
      if (y < 100) y = 2000 + y;
      if (y < 1900 || y > 2100) return;
      let m = monthSelect ? clampMonth(parseInt(monthSelect.value, 10)) : (new Date()).getMonth() + 1;
      if (!m) m = (new Date()).getMonth() + 1;
      if (seasonSelect) seasonSelect.value = '';
      currentPage = 1;
      cargarDatos({ month: m, year: y, page: currentPage });
    };
    yearInput.addEventListener('change', applyYearChange);
    yearInput.addEventListener('blur', applyYearChange);
    yearInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') applyYearChange(); });
  }

  document.getElementById('pager-prev')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      const sid = parseInt(seasonSelect?.value || '', 10) || null;
      const m   = monthSelect ? parseInt(monthSelect.value || '0', 10) : null;
      const y   = yearInput ? parseInt(yearInput.value || '0', 10) : null;
      cargarDatos({ seasonId: sid || undefined, month: m || undefined, year: y || undefined, page: currentPage });
    }
  });
  document.getElementById('pager-next')?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage += 1;
      const sid = parseInt(seasonSelect?.value || '', 10) || null;
      const m   = monthSelect ? parseInt(monthSelect.value || '0', 10) : null;
      const y   = yearInput ? parseInt(yearInput.value || '0', 10) : null;
      cargarDatos({ seasonId: sid || undefined, month: m || undefined, year: y || undefined, page: currentPage });
    }
  });

  document.addEventListener('DOMContentLoaded', async () => {
    const sid = await cargarTemporadas().catch(() => null);
    currentPage = 1;
    if (sid) cargarDatos({ seasonId: sid, page: currentPage });
    else {
      const now = new Date();
      if (monthSelect) monthSelect.value = String(now.getMonth() + 1);
      if (yearInput)  yearInput.value = String(now.getFullYear());
      cargarDatos({ month: now.getMonth() + 1, year: now.getFullYear(), page: currentPage });
    }
  });
})();