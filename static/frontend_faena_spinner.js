(function () {
  const tableBody    = document.getElementById('faena-table-body');
  const seasonSelect = document.getElementById('filter-season'); // opcional
  const monthSelect  = document.getElementById('filter-month');
  const yearInput    = document.getElementById('filter-year');

  // ---- Spinner: inject CSS + ensure overlay element ----
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

  const showLoading = () => {
    const o = document.getElementById('loading-overlay');
    if (o) o.classList.add('show');
  };
  const hideLoading = () => {
    const o = document.getElementById('loading-overlay');
    if (o) o.classList.remove('show');
  };

  const pct = (n, d) => d > 0 ? ((n / d) * 100).toFixed(2) : '0.00';
  const clampMonth = (m) => Math.min(12, Math.max(1, Number(m) || 0));

  // Rellena meses si el <select> está vacío
  (function ensureMonthOptions() {
    if (!monthSelect || monthSelect.options.length) return;
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const frag = document.createDocumentFragment();
    meses.forEach((nombre, i) => {
      const opt = document.createElement('option');
      opt.value = String(i + 1);
      opt.textContent = nombre;
      frag.appendChild(opt);
    });
    monthSelect.appendChild(frag);
  })();

  const renderizarTabla = (rows) => {
    tableBody.innerHTML = '';
    const sorted = [...rows].sort((a, b) => String(a.FechaISO).localeCompare(String(b.FechaISO)));

    sorted.forEach(item => {
      const total  = Number(item['Total Animales']) || 0;
      const halak  = Number(item['Aptos Halak']) || 0;
      const kosher = Number(item['Aptos Kosher']) || 0;
      const rech   = Number(item['Rechazos']) || 0;
      const totReg = halak + kosher + rech;

      const rcaj = Number(item['Rechazo por cajon']) || 0;
      const rliv = Number(item['Rechazo por Livianos']) || 0;
      const rpro = Number(item['Rechazo por Pulmon roto']) || 0;
      const rpul = Number(item['Rechazo por Pulmon']) || 0;

      // Preferimos 'Fecha Faena' si viene lista; si no, usamos FechaISO.
      const fecha = item['Fecha Faena'] || (function isoToDDMMYYYY(s){
        if (!s || typeof s !== 'string' || s.length < 10) return s || '';
        const [y,m,d] = s.split('-'); return `${d}-${m}-${y}`;
      })(item['FechaISO']);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fecha || ''}</td>
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
  };

  const cargarDatos = async ({month=null, year=null, seasonId=null} = {}) => {
    let url = '/api/faena/la-pampa';
    if (seasonId) url += `?season_id=${encodeURIComponent(seasonId)}`;
    else if (month && year) url += `?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`;

    showLoading();
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const appliedSeason = parseInt(resp.headers.get('X-Applied-Season') || '', 10);
      const appliedYear   = parseInt(resp.headers.get('X-Applied-Year')   || '', 10);
      const appliedMonth  = clampMonth(parseInt(resp.headers.get('X-Applied-Month') || '', 10));
      const data = await resp.json();

      if (seasonSelect && !isNaN(appliedSeason)) {
        seasonSelect.value = String(appliedSeason);
        if (monthSelect) monthSelect.value = '';
        if (yearInput) yearInput.value = '';
      } else {
        if (!isNaN(appliedYear)  && yearInput)   yearInput.value   = String(appliedYear);
        if (!isNaN(appliedMonth) && monthSelect) monthSelect.value = String(appliedMonth);
        if (seasonSelect) seasonSelect.value = '';
      }

      renderizarTabla(data);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al cargar los datos de faena.');
    } finally {
      hideLoading();
    }
  };

  const cargarTemporadas = async () => {
    if (!seasonSelect) return null;
    showLoading();
    try {
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
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      hideLoading();
    }
  };

  if (seasonSelect) {
    seasonSelect.addEventListener('change', () => {
      const sid = parseInt(seasonSelect.value, 10);
      if (sid) {
        if (monthSelect) monthSelect.value = '';
        if (yearInput) yearInput.value = '';
        cargarDatos({ seasonId: sid });
      }
    });
  }

  if (monthSelect) {
    monthSelect.addEventListener('change', () => {
      const m = clampMonth(parseInt(monthSelect.value, 10));
      const y = (yearInput && parseInt(yearInput.value, 10)) || (new Date()).getFullYear();
      if (m && y) {
        if (seasonSelect) seasonSelect.value = '';
        cargarDatos({ month: m, year: y });
      }
    });
  }

  if (yearInput) {
    const applyYearChange = () => {
      let y = parseInt(yearInput.value.trim(), 10);
      if (isNaN(y)) return;
      if (y < 100) y = 2000 + y;
      if (y < 1900 || y > 2100) return;
      let m = monthSelect ? clampMonth(parseInt(monthSelect.value, 10)) : (new Date()).getMonth() + 1;
      if (!m) m = (new Date()).getMonth() + 1;
      if (seasonSelect) seasonSelect.value = '';
      cargarDatos({ month: m, year: y });
    };
    yearInput.addEventListener('change', applyYearChange);
    yearInput.addEventListener('blur', applyYearChange);
    yearInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') applyYearChange(); });
    let yearDebounce;
    yearInput.addEventListener('input', () => {
      clearTimeout(yearDebounce);
      if (yearInput.value.trim().length >= 4) {
        yearDebounce = setTimeout(applyYearChange, 250);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    let sid = await cargarTemporadas().catch(() => null);
    if (sid) {
      cargarDatos({ seasonId: sid });
    } else {
      const now = new Date();
      if (monthSelect) monthSelect.value = String(now.getMonth() + 1);
      if (yearInput)  yearInput.value = String(now.getFullYear());
      cargarDatos({ month: now.getMonth() + 1, year: now.getFullYear() });
    }
  });
})();