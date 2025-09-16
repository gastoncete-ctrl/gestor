// frontend_cliente_loader_fast.js
// Carga rápida del combo de clientes según el frigorífico elegido.
// - Cachea resultados por frigorífico (sessionStorage + memoria)
// - Evita llamadas duplicadas y muestra el select deshabilitado mientras carga

(function () {
  const selFrig = document.getElementById('selFrigorifico');
  const selCliente = document.getElementById('selCliente');

  if (!selFrig || !selCliente) return;

  // Mem cache (por sesión de página)
  const memCache = new Map();

  function clearSelect(select, placeholder) {
    select.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder || '— Seleccionar —';
    select.appendChild(opt);
  }

  function fillSelect(select, rows) {
    clearSelect(select, '— Seleccionar cliente —');
    rows.forEach(row => {
      const opt = document.createElement('option');
      opt.value = row.id;
      opt.textContent = row.label;
      select.appendChild(opt);
    });
  }

  function getCacheKey(frigId) {
    return `clients_by_frig_${frigId}`;
  }

  async function fetchClientes(frigId) {
    // 1) Mem cache
    if (memCache.has(frigId)) return memCache.get(frigId);

    // 2) sessionStorage
    const key = getCacheKey(frigId);
    const ss = sessionStorage.getItem(key);
    if (ss) {
      try {
        const parsed = JSON.parse(ss);
        memCache.set(frigId, parsed);
        return parsed;
      } catch {}
    }

    // 3) Fetch
    const url = `/api/faena/la-pampa/clientes?frigorifico=${encodeURIComponent(frigId)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rows = (data && (data.rows || data)) || [];

    // Guarda cache
    memCache.set(frigId, rows);
    sessionStorage.setItem(key, JSON.stringify(rows));
    return rows;
  }

  async function onFrigChange() {
    const frigId = selFrig.value;
    selCliente.disabled = true;
    clearSelect(selCliente, '— Seleccionar cliente —');

    if (!frigId) return; // nada seleccionado

    try {
      const rows = await fetchClientes(frigId);
      fillSelect(selCliente, rows);
    } catch (e) {
      console.error('fetch clientes error', e);
      clearSelect(selCliente, '— Sin clientes —');
    } finally {
      selCliente.disabled = false;
    }
  }

  // Inicializa estado
  selCliente.disabled = true;
  clearSelect(selCliente, '— Seleccionar cliente —');

  // Cargar cuando cambia frigorífico
  selFrig.addEventListener('change', onFrigChange);
})();
