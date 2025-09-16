// filters_month_year_loader_v1.js
// Carga dinámicamente Meses/Años según Frigorífico+Cliente y opcional Temporada.
// No dispara carga de tabla hasta que el usuario pulse "Aplicar".

(function () {
  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => document.getElementById(id);

  // Tratar de encontrar selects por varios posibles ids
  const selFrigo = byId('selFrigorifico') || byId('frigorificoSelect') || byId('frigorifico') || document.querySelector('select[name="frigorifico"]');
  const selCliente = byId('selCliente') || byId('clienteSelect') || byId('cliente') || document.querySelector('select[name="cliente"]');
  const selTemporada = byId('selTemporada') || byId('temporadaSelect') || byId('temporada') || document.querySelector('select[name="temporada"]');

  const selMes = byId('selMes') || byId('mesSelect') || byId('mes') || document.querySelector('select[name="mes"]');
  const selAnio = byId('selAnio') || byId('anioSelect') || byId('anio') || document.querySelector('select[name="anio"]');

  const btnAplicar = byId('btnAplicar') || byId('aplicarBtn') || byId('aplicar') || document.querySelector('button[data-aplicar]') || document.querySelector('button.aplicar');

  if (!selFrigo || !selCliente || !selMes || !selAnio) {
    console.warn('No se encontraron uno o más selects (frigorífico/cliente/mes/año).');
  }

  const MONTHS_ES = {
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
    5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
  };

  // Estado inicial: deshabilitar mes y año hasta que haya frigo+cliente (y opcional temporada)
  function resetMesAnio(placeMsg) {
    setSelectOptions(selMes, [], placeMsg || '— Seleccioná mes —', true);
    setSelectOptions(selAnio, [], '— Seleccioná año —', true);
  }

  function setSelectOptions(select, items, placeholder, disabled) {
    if (!select) return;
    const oldVal = select.value;
    select.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = placeholder || '— Seleccioná —';
    select.appendChild(opt0);
    if (Array.isArray(items)) {
      items.forEach((it) => {
        const opt = document.createElement('option');
        if (typeof it === 'object') {
          opt.value = it.value;
          opt.textContent = it.label;
        } else {
          opt.value = String(it);
          opt.textContent = String(it);
        }
        select.appendChild(opt);
      });
    }
    select.disabled = !!disabled;
    // No restauramos oldVal para evitar inconsistencias con filtros
  }

  function getInt(select) {
    if (!select) return null;
    const v = parseInt(select.value, 10);
    return Number.isFinite(v) ? v : null;
  }

  // Cargar Meses/Años desde backend
  async function cargarMesesAnios() {
    if (!selFrigo || !selCliente) return;
    const frigo = getInt(selFrigo);
    const cliente = getInt(selCliente);
    const seasonId = getInt(selTemporada);

    if (!frigo || !cliente) {
      resetMesAnio('— Seleccioná mes —');
      return;
    }

    let url = `/api/faena/la-pampa/meses-anios?frigorifico=${frigo}&cliente=${cliente}`;
    if (seasonId) url += `&season_id=${seasonId}`;

    try {
      const r = await fetch(url, { cache: 'no-store' });
      const data = await r.json();

      const years = Array.isArray(data?.years) ? data.years : [];
      const months = Array.isArray(data?.months) ? data.months : [];
      const perYear = (data && data.per_year) ? data.per_year : {};

      // Poblar años
      setSelectOptions(selAnio, years, '— Seleccioná año —', years.length === 0);

      // Poblar meses (si no hay año elegido aún, mostramos todos disponibles)
      const mesesOpts = months.map((m) => ({ value: String(m), label: MONTHS_ES[m] || String(m) }));
      setSelectOptions(selMes, mesesOpts, '— Seleccioná mes —', months.length === 0);

      // Si el usuario cambia de año, filtramos meses a los disponibles de ese año
      if (selAnio) {
        selAnio.onchange = () => {
          const y = selAnio.value;
          let meses = months;
          if (y && perYear[String(y)]) {
            meses = perYear[String(y)];
          }
          const arr = (meses || []).map((m) => ({ value: String(m), label: MONTHS_ES[m] || String(m) }));
          setSelectOptions(selMes, arr, '— Seleccioná mes —', arr.length === 0);
        };
      }
    } catch (e) {
      console.error('meses-anios error', e);
      resetMesAnio('— Seleccioná mes —');
    }
  }

  // Al cambiar frigo, cliente o temporada → refrescar Mes/Año
  if (selFrigo) selFrigo.addEventListener('change', cargarMesesAnios);
  if (selCliente) selCliente.addEventListener('change', cargarMesesAnios);
  if (selTemporada) selTemporada.addEventListener('change', cargarMesesAnios);

  // Botón Aplicar: arma los params y dispara carga de tabla
  async function onAplicar() {
    if (!selFrigo || !selCliente) return;
    const frigo = getInt(selFrigo);
    const cliente = getInt(selCliente);
    const seasonId = getInt(selTemporada);
    const mes = getInt(selMes);
    const anio = getInt(selAnio);

    if (!frigo || !cliente) {
      alert('Elegí primero frigorífico y cliente.');
      return;
    }

    let params = { frigorifico: frigo, cliente: cliente };
    if (seasonId) {
      params.season_id = seasonId;
    } else {
      // Si no hay temporada, exigir mes + año
      if (!mes || !anio) {
        alert('Elegí mes y año (o una temporada).');
        return;
      }
      params.month = mes;
      params.year = anio;
    }

    // No cargamos nada hasta que el usuario presione "Aplicar"
    // Aquí delegamos al cargador de tabla ya existente (si existe)
    if (typeof window.cargarDatosFaena === 'function') {
      window.cargarDatosFaena(params);
    } else if (typeof window.cargarDatos === 'function') {
      window.cargarDatos(params);
    } else {
      // Fallback simple (solo consulta y loguea resultados)
      const q = new URLSearchParams(params).toString();
      const r = await fetch(`/api/faena/la-pampa?${q}`);
      console.log('Resultados (fallback):', await r.json());
    }
  }

  if (btnAplicar) {
    btnAplicar.addEventListener('click', onAplicar);
  } else {
    console.warn('No se encontró el botón "Aplicar". Agregá id="btnAplicar" al botón.');
  }

  // Al iniciar, dejar Mes/Año bloqueados hasta que haya frigo+cliente (y opcional temporada)
  resetMesAnio('— Seleccioná mes —');
})();
