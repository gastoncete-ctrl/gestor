
/**
 * filters_month_year_loader_v2.js
 *
 * Pone en marcha el flujo de selects y el botón "Aplicar":
 * - No carga nada automáticamente.
 * - Llena meses/años desde /api/faena/la-pampa/meses-anios según frigorífico/cliente
 *   y (si corresponde) temporada.
 * - Al presionar "Aplicar" arma los params y llama a window.cargarDatosFaena(params).
 */
(function () {
  const API = {
    mesesAnios: '/api/faena/la-pampa/meses-anios',
  };

  // Tolerancia de IDs
  function pick(...ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  const selFrig = pick('selFrigorifico', 'frigorificoSelect', 'frigorifico');
  const selCli  = pick('selCliente', 'clienteSelect', 'cliente');
  const selTemp = pick('selTemporada', 'temporadaSelect', 'temporada');
  const selMes  = pick('selMes', 'mesSelect', 'mes');
  const selAnio = pick('selAnio', 'anioSelect', 'anio', 'anioSelectFilter');
  const btnAp   = document.getElementById('btnAplicar') || document.querySelector('[data-role="aplicar"]');

  if (!selFrig || !selCli || !selMes || !selAnio || !btnAp) {
    console.warn('Faltan elementos del filtro: frigorifico/cliente/mes/anio/boton.');
    return;
  }
  if (!selTemp) console.warn('No se encontró select de temporada (opcional).');

  function resetSelect(el, placeholder) {
    if (!el) return;
    el.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder || '-- Seleccionar --';
    el.appendChild(opt);
    el.value = '';
  }

  function setDisabled(el, dis) {
    if (!el) return;
    el.disabled = !!dis;
  }

  function cargarMesesAnios() {
    const frigorifico = selFrig.value || '';
    const cliente = selCli.value || '';
    const season_id = selTemp && selTemp.value ? selTemp.value : '';

    resetSelect(selMes, 'Mes');
    resetSelect(selAnio, 'Año');

    if (!frigorifico || !cliente) {
      setDisabled(selMes, true);
      setDisabled(selAnio, true);
      return;
    }

    const qs = new URLSearchParams({ frigorifico, cliente });
    if (season_id) qs.set('season_id', season_id);

    fetch(`${API.mesesAnios}?${qs.toString()}`)
      .then(r => r.json())
      .then(data => {
        const months = Array.isArray(data.months) ? data.months : [];
        const years = Array.isArray(data.years) ? data.years : [];

        const monthNames = [
          '', 'Enero','Febrero','Marzo','Abril','Mayo','Junio',
          'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
        ];

        // llenar meses
        for (const m of months) {
          const opt = document.createElement('option');
          opt.value = String(m);
          const label = monthNames[m] || `Mes ${m}`;
          opt.textContent = label;
          selMes.appendChild(opt);
        }
        // llenar años
        for (const y of years) {
          const opt = document.createElement('option');
          opt.value = String(y);
          opt.textContent = String(y);
          selAnio.appendChild(opt);
        }

        setDisabled(selMes, months.length === 0);
        setDisabled(selAnio, years.length === 0);
      })
      .catch(err => {
        console.error('meses-anios error', err);
      });
  }

  // Estados iniciales
  resetSelect(selMes, 'Mes');
  resetSelect(selAnio, 'Año');
  setDisabled(selMes, true);
  setDisabled(selAnio, true);

  // Temporada arrancará deshabilitada hasta tener frig+cliente (si el HTML no lo hace ya)
  if (selTemp) {
    resetSelect(selTemp, '— Seleccioná frigorífico y cliente —');
    setDisabled(selTemp, !(selFrig.value && selCli.value));
  }

  // Eventos: al cambiar frig/cliente/temporada → recargar meses/años
  selFrig.addEventListener('change', () => {
    if (selTemp) {
      resetSelect(selTemp, '— Seleccioná temporada —');
      setDisabled(selTemp, !selFrig.value || !selCli.value);
    }
    cargarMesesAnios();
  });
  selCli.addEventListener('change', () => {
    if (selTemp) {
      resetSelect(selTemp, '— Seleccioná temporada —');
      setDisabled(selTemp, !selFrig.value || !selCli.value);
    }
    cargarMesesAnios();
  });
  if (selTemp) selTemp.addEventListener('change', cargarMesesAnios);

  // Botón Aplicar
  btnAp.addEventListener('click', () => {
    const frigorifico = selFrig.value || '';
    const cliente = selCli.value || '';
    const season_id = selTemp && selTemp.value ? selTemp.value : '';
    const month = selMes.value || '';
    const year = selAnio.value || '';

    if (!frigorifico || !cliente) {
      alert('Elegí frigorífico y cliente.');
      return;
    }
    const params = { frigorifico, cliente };
    if (season_id) {
      params.season_id = season_id;
    } else {
      if (!month || !year) {
        alert('Elegí mes y año o una temporada.');
        return;
      }
      params.month = month;
      params.year = year;
    }

    if (typeof window.cargarDatosFaena === 'function') {
      window.cargarDatosFaena(params);
    } else {
      console.error('window.cargarDatosFaena no está definido.');
    }
  });
})();
