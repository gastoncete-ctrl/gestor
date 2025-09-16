
/* faena_clean_filters_v1.js
   - Resetea y maneja los filtros (frigorífico, cliente, temporada, mes, año)
   - Pide meses/años según selección
   - Carga la tabla SOLO al tocar "Aplicar"
   - Incluye un render mínimo de la tabla (puedes reemplazarlo por el de tu proyecto)
*/

(function () {
  const $ = (sel) => document.querySelector(sel);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  // Permite cambiar IDs sin tocar el archivo
  const CFG = Object.assign({
    frigorifico: '#selFrigorifico',
    cliente:     '#selCliente',
    temporada:   '#temporadaSelect',
    mes:         '#filter-month',
    anio:        '#filter-year',
    aplicar:     '#apply-filter',
    tableBody:   '#faena-tbody' // si no existe, tomamos el primer <tbody>
  }, window.FILTERS_CONFIG || {});

  const el = {
    frig: $(CFG.frigorifico),
    cli:  $(CFG.cliente),
    temp: $(CFG.temporada),
    mes:  $(CFG.mes),
    anio: $(CFG.anio),
    btn:  $(CFG.aplicar)
  };

  if (!el.frig || !el.cli || !el.temp || !el.mes || !el.anio || !el.btn) {
    console.warn('[faena_clean] Faltan elementos. Revisa IDs o el orden de carga de scripts.', CFG);
    return;
  }

  const state = {
    frig: null,
    cli: null,
    temp: null,
    mes: null,
    anio: null
  };

  function disable(elm, msg) {
    if (!elm) return;
    elm.disabled = true;
    elm.innerHTML = '';
    if (msg) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = msg;
      elm.appendChild(opt);
    }
  }
  function enable(elm) { if (elm) elm.disabled = false; }
  function setOptions(select, pairs, placeholder) {
    select.innerHTML = '';
    if (placeholder) {
      const opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = placeholder;
      select.appendChild(opt0);
    }
    (pairs || []).forEach(p => {
      const o = document.createElement('option');
      o.value = String(p.value);
      o.textContent = p.label;
      select.appendChild(o);
    });
  }

  function resetAll() {
    disable(el.temp, '— Seleccioná frigorífico y cliente —');
    disable(el.mes, 'Mes');
    disable(el.anio, 'Año');
  }

  resetAll();

  // ---------- Helpers de red ----------
  async function GET(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  async function loadTemporadas() {
    if (!state.frig || !state.cli) {
      resetAll();
      return;
    }
    try {
      const data = await GET(`/api/faena/la-pampa/temporadas?frigorifico=${state.frig}&cliente=${state.cli}`);
      const rows = data.rows || data || [];
      const opts = rows.map(r => ({
        value: r.id,
        label: `Temporada (${r.fecha_inicio} a ${r.fecha_final})`
      }));
      enable(el.temp);
      setOptions(el.temp, opts, '— Seleccionar temporada —');
    } catch (e) {
      console.warn('Temporadas falló:', e);
      resetAll();
    }
  }

  async function loadMesesAnios() {
    if (!state.frig || !state.cli) {
      resetAll();
      return;
    }
    try {
      const qs = new URLSearchParams({ frigorifico: state.frig, cliente: state.cli });
      if (state.temp) qs.set('season_id', state.temp);
      const data = await GET(`/api/faena/la-pampa/meses-anios?${qs.toString()}`);
      const months = (data.months || []).map(m => ({ value: m, label: String(m).padStart(2,'0') }));
      const years  = (data.years || []).map(y => ({ value: y, label: String(y) }));
      enable(el.mes);  setOptions(el.mes, months, 'Mes');
      enable(el.anio); setOptions(el.anio, years,  'Año');
    } catch (e) {
      console.warn('Meses/Años falló:', e);
      disable(el.mes,  'Mes');
      disable(el.anio, 'Año');
    }
  }

  // ---------- Render mínimo de la tabla ----------
  function renderTabla(items) {
    let tbody = document.querySelector(CFG.tableBody) || document.querySelector('table tbody');
    if (!tbody) {
      console.warn('[faena_clean] No encontré <tbody>; creo uno provisional.');
      const t = document.createElement('table');
      tbody = document.createElement('tbody');
      t.appendChild(tbody);
      document.body.appendChild(t);
    }
    tbody.innerHTML = '';
    (items || []).forEach(r => {
      const total = Number(r['Total Animales'] || 0);
      const halak = Number(r['Aptos Halak'] || 0);
      const kosher = Number(r['Aptos Kosher'] || 0);
      const rech = Number(r['Rechazos'] || 0);
      const pct = (v) => total ? ((v/total)*100).toFixed(2) + '%' : '0%';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r['Fecha Faena'] ?? ''}</td>
        <td>${total}</td>
        <td>${halak}</td><td>${pct(halak)}</td>
        <td>${kosher}</td><td>${pct(kosher)}</td>
        <td>${rech}</td><td>${pct(rech)}</td>
        <td>${r['Rechazo por cajon'] ?? 0}</td><td>${pct(Number(r['Rechazo por cajon']||0))}</td>
        <td>${r['Rechazo por Livianos'] ?? 0}</td><td>${pct(Number(r['Rechazo por Livianos']||0))}</td>
        <td>${r['Rechazo por Pulmon roto'] ?? 0}</td><td>${pct(Number(r['Rechazo por Pulmon roto']||0))}</td>
        <td>${r['Rechazo por Pulmon'] ?? 0}</td><td>${pct(Number(r['Rechazo por Pulmon']||0))}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ---------- Eventos ----------
  on(el.frig, 'change', async (e) => {
    state.frig = e.target.value || null;
    // al cambiar frigorífico, forzamos a re-seleccionar cliente
    state.cli = null; el.cli.value = '';
    disable(el.temp, '— Seleccioná frigorífico y cliente —');
    disable(el.mes, 'Mes'); disable(el.anio, 'Año');
    // si tienes un endpoint para clientes por frigorífico, puedes cargarlo aquí
    // (lo omitimos porque ya lo manejas con tu propio JS de clientes)
  });

  on(el.cli, 'change', async (e) => {
    state.cli = e.target.value || null;
    state.temp = null; el.temp.value = '';
    await loadTemporadas();
    await loadMesesAnios();
  });

  on(el.temp, 'change', async (e) => {
    state.temp = e.target.value || null;
    await loadMesesAnios();
  });

  on(el.mes, 'change', (e) => { state.mes = e.target.value || null; });
  on(el.anio, 'change', (e) => { state.anio = e.target.value || null; });

  on(el.btn, 'click', async () => {
    // No hacemos nada si falta frigorífico o cliente
    if (!state.frig || !state.cli) return;
    // Si el usuario eligió mes, debe elegir año
    if (state.mes && !state.anio) {
      alert('Elegí también un año.');
      return;
    }
    try {
      const qs = new URLSearchParams({
        page: 1, per_page: 100, order: 'asc',
        frigorifico: state.frig, cliente: state.cli
      });
      if (state.temp) qs.set('season_id', state.temp);
      if (state.mes)  qs.set('month', state.mes);
      if (state.anio) qs.set('year',  state.anio);

      const data = await GET(`/api/faena/la-pampa?${qs.toString()}`);
      // si tu proyecto ya tiene un render propio, puedes exponerlo como window.renderFaena y lo usamos
      if (typeof window.renderFaena === 'function') {
        window.renderFaena(data.items || []);
      } else {
        renderTabla(data.items || []);
      }
      console.log('[faena_clean] Summary:', data.summary);
    } catch (e) {
      console.error('Aplicar falló:', e);
      alert('No se pudieron cargar los datos.');
    }
  });

  console.log('[faena_clean] listo', CFG);
})();
