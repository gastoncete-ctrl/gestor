// filters_client_frig_loader.js
const selCliente    = document.getElementById('filter-cliente');
const selFrig       = document.getElementById('filter-frigorifico');

async function cargarClientes() {
  if (!selCliente) return;
  selCliente.innerHTML = '<option value="">Todos</option>';
  try {
    const r = await fetch('/api/faena/la-pampa/clientes');
    if (!r.ok) return;
    const data = await r.json();
    for (const it of data) {
      const o = document.createElement('option');
      o.value = it.id;
      o.textContent = it.label ?? String(it.id);
      selCliente.appendChild(o);
    }
  } catch {}
}

async function cargarFrigorificos(clienteId = '') {
  if (!selFrig) return;
  selFrig.innerHTML = '<option value="">Todos</option>';
  try {
    const url = clienteId ? `/api/faena/la-pampa/frigorificos?cliente=${encodeURIComponent(clienteId)}`
                          : '/api/faena/la-pampa/frigorificos';
    const r = await fetch(url);
    if (!r.ok) return;
    const data = await r.json();
    for (const it of data) {
      const o = document.createElement('option');
      o.value = it.id;
      o.textContent = it.label ?? String(it.id);
      selFrig.appendChild(o);
    }
  } catch {}
}

if (selCliente) {
  selCliente.addEventListener('change', () => {
    cargarFrigorificos(selCliente.value || '');
  });
}

function appendClientFrigParams(params) {
  if (selCliente && selCliente.value) params.set('cliente', selCliente.value);
  if (selFrig && selFrig.value)       params.set('frigorifico', selFrig.value);
  return params;
}

document.addEventListener('DOMContentLoaded', async () => {
  await cargarClientes();
  await cargarFrigorificos('');
});
