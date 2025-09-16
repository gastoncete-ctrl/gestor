// frontend_cliente_loader.js
// Carga el combo de clientes según el frigorífico seleccionado.
// Requiere que existan en el HTML:
//   <select id="selFrigorifico">...</select>
//   <select id="selCliente"></select>

(function () {
  function qs(id) { return document.getElementById(id); }
  const selFrig = qs('selFrigorifico');
  const selCli  = qs('selCliente');

  function setDisabled(el, disabled) {
    if (!el) return;
    el.disabled = !!disabled;
  }

  function clearAndSetPlaceholder(select, placeholder) {
    if (!select) return;
    select.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder || '-- Seleccionar --';
    select.appendChild(opt);
  }

  async function cargarClientes(idFrig) {
    if (!selCli) return;
    clearAndSetPlaceholder(selCli, '-- Seleccionar cliente --');
    setDisabled(selCli, true);

    if (!idFrig) return;

    try {
      const url = `/api/faena/la-pampa/clientes?frigorifico=${encodeURIComponent(idFrig)}`;
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const rows = Array.isArray(data) ? data : (data.rows || []);
      selCli.innerHTML = '';
      if (!rows.length) {
        clearAndSetPlaceholder(selCli, '-- Sin clientes --');
        setDisabled(selCli, true);
        return;
      }

      const ph = document.createElement('option');
      ph.value = '';
      ph.textContent = '-- Seleccionar cliente --';
      selCli.appendChild(ph);

      for (const r of rows) {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.label ?? String(r.id);
        selCli.appendChild(opt);
      }
      setDisabled(selCli, false);
    } catch (err) {
      console.error('Error cargando clientes:', err);
      clearAndSetPlaceholder(selCli, '-- Error al cargar clientes --');
      setDisabled(selCli, true);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!selFrig) return;

    // Limpia la tabla al cambiar de frigorífico (si tienes una función de limpieza).
    selFrig.addEventListener('change', () => {
      const idFrig = selFrig.value;
      cargarClientes(idFrig);
      // Si quieres, aquí podrías limpiar la tabla:
      // if (window.limpiarTabla) window.limpiarTabla();
    });

    // Si al cargar ya hay frigorífico seleccionado, precarga clientes.
    if (selFrig.value) {
      cargarClientes(selFrig.value);
    } else {
      if (selCli) {
        clearAndSetPlaceholder(selCli, '-- Seleccionar cliente --');
        setDisabled(selCli, true);
      }
    }
  });
})();