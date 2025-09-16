
/**
 * filters_month_year_loader_v3.js
 * - Llena los combos de Mes/Año según frigorífico+cliente (+ temporada opcional).
 * - No dispara carga de tabla; solo prepara los filtros.
 * - Al tocar "Aplicar" llama a window.cargarDatosFaena(params).
 */

(function () {
  const $ = (sel) => document.querySelector(sel);

  // Tolerante con IDs existentes
  const selFrigo = $('#selFrigorifico') || $('#frigorificoSelect') || $('#frigorifico');
  const selCliente = $('#selCliente') || $('#clienteSelect') || $('#cliente');
  const selTemporada = $('#selTemporada') || $('#temporadaSelect') || $('#temporada');
  const selMes = $('#selMes') || $('#mesSelect') || $('#mes');
  const selAnio = $('#selAnio') || $('#anioSelect') || $('#anio') || $('#anioSelectFilter');
  const btnAplicar = $('#btnAplicar') || document.querySelector('[data-role="aplicar"]');

  const monthNames = [
    '01 - Enero','02 - Febrero','03 - Marzo','04 - Abril','05 - Mayo','06 - Junio',
    '07 - Julio','08 - Agosto','09 - Septiembre','10 - Octubre','11 - Noviembre','12 - Diciembre'
  ];

  function disable(el, placeholderText) {
    if (!el) return;
    el.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholderText || '—';
    el.appendChild(opt);
    el.value = '';
    el.disabled = true;
  }

  function enable(el) {
    if (!el) return;
    el.disabled = false;
  }

  function setOptions(el, values, labeler) {
    if (!el) return;
    el.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = el === selMes ? 'Mes' : 'Año';
    el.appendChild(ph);
    (values || []).forEach((v) => {
      const opt = document.createElement('option');
      opt.value = String(v);
      opt.textContent = labeler ? labeler(v) : String(v);
      el.appendChild(opt);
    });
    enable(el);
  }

  function selectedInt(el) {
    if (!el) return null;
    const v = (el.value || '').trim();
    if (!v) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }

  async function fetchMesesAnios() {
    const frigorifico = selectedInt(selFrigo);
    const cliente = selectedInt(selCliente);
    if (!frigorifico || !cliente) {
      disable(selMes, 'Mes');
      disable(selAnio, 'Año');
      return;
    }
    const season_id = selectedInt(selTemporada);

    const qs = new URLSearchParams({ frigorifico: String(frigorifico), cliente: String(cliente) });
    if (season_id) qs.set('season_id', String(season_id));

    try {
      const res = await fetch(`/api/faena/la-pampa/meses-anios?${qs.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Acepta {months:[...], years:[...] } o {rows:[{m,y}...]}
      let months = data.months, years = data.years;
      if (!Array.isArray(months) || !Array.isArray(years)) {
        const rows = data.rows || [];
        months = [...new Set(rows.map(r => r.m))].sort((a,b)=>a-b);
        years  = [...new Set(rows.map(r => r.y))].sort((a,b)=>b-a);
      }

      setOptions(selMes, months, (m)=>monthNames[(m-1+12)%12] || String(m));
      setOptions(selAnio, years, (y)=>String(y));
    } catch (err) {
      console.error('meses-anios error:', err);
      disable(selMes, 'Mes');
      disable(selAnio, 'Año');
    }
  }

  function onChangeAnyFilter() {
    // Si cambia frigo/cliente/temporada → refrezca meses/años.
    fetchMesesAnios();
  }

  async function onAplicar() {
    const frigorifico = selectedInt(selFrigo);
    const cliente = selectedInt(selCliente);
    if (!frigorifico || !cliente) {
      alert('Elegí frigorífico y cliente.');
      return;
    }

    const season_id = selectedInt(selTemporada);
    const month = selectedInt(selMes);
    const year = selectedInt(selAnio);

    /** Regla:
     * - Si hay temporada → filtra por temporada y se ignoran mes/año.
     * - Si no hay temporada → necesita mes + año.
     */
    const params = { frigorifico, cliente };
    if (season_id) {
      params.season_id = season_id;
    } else {
      if (!month || !year) {
        alert('Elegí mes y año, o seleccioná una temporada.');
        return;
      }
      params.month = month;
      params.year = year;
    }

    if (typeof window.cargarDatosFaena === 'function') {
      window.cargarDatosFaena(params);
    } else {
      console.warn('cargarDatosFaena(params) no está definido.');
    }
  }

  // Estado inicial
  disable(selMes, 'Mes');
  disable(selAnio, 'Año');

  // Listeners
  if (selFrigo) selFrigo.addEventListener('change', onChangeAnyFilter);
  if (selCliente) selCliente.addEventListener('change', onChangeAnyFilter);
  if (selTemporada) selTemporada.addEventListener('change', onChangeAnyFilter);
  if (btnAplicar) btnAplicar.addEventListener('click', onAplicar);
})();
