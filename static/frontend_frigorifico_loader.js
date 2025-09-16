
// frontend_frigorifico_loader.js
// ------------------------------------------------------------
// Carga el combo de frigoríficos y deja la tabla vacía
// hasta que se seleccione uno.
// Requiere un <select id="selFrigorifico"> en el HTML.
// (Opcional) Si tenés un botón "Aplicar", dale id="btnAplicar".
// ------------------------------------------------------------

// === Config rápidos (cambialos si tus ids son otros)
const SELECT_FRIG_ID = 'selFrigorifico';
const BTN_APLICAR_ID = 'btnAplicar';
// Selector del tbody de tu tabla (ajustá al tuyo)
const TBODY_SELECTOR = '#tabla-faena tbody';

function pickRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.rows)) return payload.rows;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

async function cargarFrigorificos() {
  const sel = document.getElementById(SELECT_FRIG_ID);
  if (!sel) return;
  sel.innerHTML = '<option value="">— Seleccionar frigorífico —</option>';
  try {
    const resp = await fetch('/api/faena/la-pampa/frigorificos');
    const json = await resp.json();
    const rows = pickRows(json);
    rows.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.label || r.nombre || String(r.id);
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error('Error cargando frigoríficos:', e);
  }
}

function limpiarTablaYTotales() {
  const tbody = document.querySelector(TBODY_SELECTOR);
  if (tbody) tbody.innerHTML = '';
  // Si tenés tarjetas/contadores, podés dejarlos en cero aquí.
}

document.addEventListener('DOMContentLoaded', () => {
  // 1) Cargar combo
  cargarFrigorificos();

  // 2) Tabla VACÍA inicialmente + botón aplicar deshabilitado (si existe)
  limpiarTablaYTotales();
  const btn = document.getElementById(BTN_APLICAR_ID);
  if (btn) btn.disabled = true;

  // 3) Al elegir frigorífico, habilitar acciones (más adelante encadenaremos cargas)
  const selFrig = document.getElementById(SELECT_FRIG_ID);
  if (selFrig) {
    selFrig.addEventListener('change', () => {
      limpiarTablaYTotales();
      if (btn) btn.disabled = (selFrig.value === '');
      // Aquí después vas a disparar la carga de clientes/temporadas y datos.
    });
  }
});
// ------------------------------------------------------------
