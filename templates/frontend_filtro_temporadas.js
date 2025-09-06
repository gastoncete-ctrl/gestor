// --- Script de frontend con filtro por temporadas (auto-aplicar) ---
// Requiere un <select id="filter-season"></select> en el HTML junto a los de mes/año.
const tableBody   = document.getElementById('faena-table-body');
const monthSelect = document.getElementById('filter-month');
const yearInput   = document.getElementById('filter-year');
const seasonSelect= document.getElementById('filter-season');
const applyBtn    = document.getElementById('apply-filter'); // opcional (se oculta)
const clearBtn    = document.getElementById('clear-filter'); // opcional

if (applyBtn) applyBtn.style.display = 'none';

const pct = (num, den) => den > 0 ? ((num / den) * 100).toFixed(2) : '0.00';

const formatDDMMYYYY = (value) => {
  if (!value) return '';
  const dt = new Date(String(value).replace(' ', 'T'));
  if (isNaN(dt)) return String(value);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = dt.getFullYear();
  return `${dd}-${mm}-${yy}`;
};

const renderizarTabla = (rows) => {
  tableBody.innerHTML = '';
  rows.forEach(item => {
    const totalCabezas  = Number(item["Total Animales"]) || 0;
    const aptosHalak    = Number(item["Aptos Halak"]) || 0;
    const aptosKosher   = Number(item["Aptos Kosher"]) || 0;
    const rechazos      = Number(item["Rechazos"]) || 0;

    const totalRegistradas = aptosHalak + aptosKosher + rechazos;

    const rechazoCajon   = Number(item["Rechazo por cajon"]) || 0;
    const rechazoLiv     = Number(item["Rechazo por Livianos"]) || 0;
    const rechazoPRoto   = Number(item["Rechazo por Pulmon roto"]) || 0;
    const rechazoPul     = Number(item["Rechazo por Pulmon"]) || 0;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDDMMYYYY(item['Fecha Faena'])}</td>
      <td>${totalCabezas}</td>
      <td>${aptosHalak}</td>
      <td>${pct(aptosHalak, totalCabezas)}%</td>
      <td>${aptosKosher}</td>
      <td>${pct(aptosKosher, totalCabezas)}%</td>
      <td>${rechazos}</td>
      <td>${pct(rechazos, totalCabezas)}%</td>
      <td>${totalRegistradas}</td>
      <td>${pct(totalRegistradas, totalCabezas)}%</td>
      <td>${rechazoCajon}</td>
      <td>${pct(rechazoCajon, totalCabezas)}%</td>
      <td>${rechazoLiv}</td>
      <td>${pct(rechazoLiv, totalCabezas)}%</td>
      <td>${rechazoPRoto}</td>
      <td>${pct(rechazoPRoto, totalCabezas)}%</td>
      <td>${rechazoPul}</td>
      <td>${pct(rechazoPul, totalCabezas)}%</td>
    `;
    tableBody.appendChild(row);
  });
};

const clampMonth = (m) => Math.min(12, Math.max(1, Number(m) || 0));

const cargarDatos = async ({month=null, year=null, seasonId=null} = {}) => {
  try {
    let url = '/api/faena/la-pampa';
    if (seasonId) {
      url += `?season_id=${encodeURIComponent(seasonId)}`;
    } else if (month && year) {
      url += `?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`;
    }
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const appliedSeason = parseInt(resp.headers.get('X-Applied-Season') || '', 10);
    const appliedYear   = parseInt(resp.headers.get('X-Applied-Year')   || '', 10);
    const appliedMonth  = clampMonth(parseInt(resp.headers.get('X-Applied-Month') || '', 10));
    const data = await resp.json();

    if (!isNaN(appliedSeason)) {
      seasonSelect.value = String(appliedSeason);
      renderizarTabla(data);
      return;
    }
    if (!isNaN(appliedYear) && !isNaN(appliedMonth)) {
      yearInput.value   = String(appliedYear);
      monthSelect.value = String(appliedMonth);
    }
    renderizarTabla(data);
  } catch (err) {
    console.error(err);
    alert('Ocurrió un error al cargar los datos.');
  }
};

const cargarTemporadas = async () => {
  const r = await fetch('/api/faena/la-pampa/temporadas');
  if (!r.ok) throw new Error('No se pudieron cargar las temporadas');
  const { current_id, temporadas } = await r.json();
  // poblar select
  seasonSelect.innerHTML = '<option value="">-- Seleccionar temporada --</option>';
  for (const t of temporadas) {
    const opt = document.createElement('option');
    opt.value = String(t.id);
    opt.textContent = t.label;
    seasonSelect.appendChild(opt);
  }
  // seleccionar temporada actual por defecto
  if (current_id) {
    seasonSelect.value = String(current_id);
  }
  return current_id;
};

// --- Auto-aplicado ---
// Cambiar temporada: aplica temporada y limpia mes/año
seasonSelect.addEventListener('change', () => {
  const sid = parseInt(seasonSelect.value, 10);
  if (sid) {
    monthSelect.value = '';
    yearInput.value = '';
    cargarDatos({seasonId: sid});
  }
});

// Cambiar mes/año: aplica mes/año y limpia temporada
monthSelect.addEventListener('change', () => {
  const m = clampMonth(parseInt(monthSelect.value, 10));
  const y = parseInt(yearInput.value, 10) || (new Date()).getFullYear();
  if (m && y) {
    seasonSelect.value = '';
    cargarDatos({month: m, year: y});
  }
});
let yearDebounce;
const applyYearChange = () => {
  const yRaw = yearInput.value.trim();
  let y = parseInt(yRaw, 10);
  if (!isNaN(y) && y < 100) y = 2000 + y;
  if (!y || y < 1900 || y > 2100) return;
  let m = clampMonth(parseInt(monthSelect.value, 10));
  if (!m) m = (new Date()).getMonth() + 1;
  seasonSelect.value = '';
  cargarDatos({month: m, year: y});
};
yearInput.addEventListener('change', applyYearChange);
yearInput.addEventListener('input', () => {
  clearTimeout(yearDebounce);
  yearDebounce = setTimeout(applyYearChange, 400);
});

// Botón "Ver todo": ahora carga la temporada actual
if (clearBtn) {
  clearBtn.textContent = 'Temporada actual';
  clearBtn.addEventListener('click', async () => {
    const currentId = await cargarTemporadas(); // repuebla y setea current
    if (currentId) {
      cargarDatos({seasonId: currentId});
    }
  });
}

// Carga inicial: lista de temporadas y temporada actual
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const currentId = await cargarTemporadas();
    if (currentId) {
      await cargarDatos({seasonId: currentId});
    } else {
      // fallback: mes/año del navegador
      const now = new Date();
      await cargarDatos({month: now.getMonth()+1, year: now.getFullYear()});
    }
  } catch (e) {
    console.error(e);
  }
});
