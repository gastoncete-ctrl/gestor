// Enlaza el botón "Aplicar", arma la query a /api/faena/la-pampa
// y renderiza la tabla. Tolerante a formatos de respuesta.

(function () {
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sels) => sels.split(',').map(s => s.trim()).map(s => $(s)).find(Boolean);

  const selFrig = $('#selFrigorifico');
  const selCli  = $('#selCliente');
  const selTemp = $('#temporadaSelect');
  const selMes  = $('#filter-month');
  const selAno  = $('#filter-year');
  const btn     = $('#apply-filter');

  const tbody = $$('#faena-tbody, #table-body'); // usa el primero que exista

  if (!selFrig || !selCli || !selTemp || !selMes || !selAno || !btn || !tbody) {
    console.warn('[apply_bind_v4] Faltan elementos en el DOM.',
      { selFrig: !!selFrig, selCli: !!selCli, selTemp: !!selTemp, selMes: !!selMes, selAno: !!selAno, btn: !!btn, tbody: !!tbody });
    return;
  }

  // Utilidades
  const fmtInt = (v) => (v == null || isNaN(v)) ? '' : Number(v).toLocaleString('es-AR');
  const fmtPct = (v) => (v == null || isNaN(v)) ? '' : `${Number(v).toFixed(2)}%`;

  function calcPct(part, total) {
    const p = Number(part), t = Number(total);
    if (!t || isNaN(p) || isNaN(t)) return null;
    return (p * 100) / t;
  }

  // Extrae un valor de múltiples claves posibles
  function pick(row, keys) {
    for (const k of keys) {
      if (k in row && row[k] != null) return row[k];
    }
    return null;
  }

  // Renderiza filas (usa lo que haya; si falta el % lo calcula)
  function renderRows(rows) {
    const frag = document.createDocumentFragment();

    rows.forEach((r) => {
      const tr = document.createElement('tr');

      const fecha = pick(r, ['Fecha Faena', 'fecha', 'Fecha', 'fecha_faena', 'FechaISO']) || '';

      const totalAnim = pick(r, ['Total Animales', 'total', 'Total', 'Total_Animales', 'TotalAnimales']);
      const halak    = pick(r, ['Aptos Halak', 'halak', 'Halak', 'Total Halak']);
      const kosher   = pick(r, ['Aptos Kosher', 'kosher', 'Kosher', 'Total Kosher']);
      const rech     = pick(r, ['Rechazos', 'rechazo', 'Rechazo']);

      // % si vienen; si no, los calculo
      let pctHalak  = pick(r, ['% Halak', 'pct_halak', 'halak_pct']);
      let pctKosher = pick(r, ['% Kosher', 'pct_kosher', 'kosher_pct']);
      let pctRech   = pick(r, ['% Rechazo', 'pct_rechazo', 'rechazo_pct']);

      if (pctHalak == null)  pctHalak  = calcPct(halak, totalAnim);
      if (pctKosher == null) pctKosher = calcPct(kosher, totalAnim);
      if (pctRech == null)   pctRech   = calcPct(rech, totalAnim);

      const totalReg = pick(r, ['Total Registradas', 'Total Registrada', 'Total_Registradas', 'total_registradas']);
      const pctTotal = pick(r, ['% Total', 'pct_total']);

      // Rechazos por categoría (cantidad + % si están)
      const rcCajCant = pick(r, ['Rechazo por cajón', 'rechazo_cajon', 'rechazo_cajon_cantidad', 'Rechazo por cajon']);
      const rcCajPct  = pick(r, ['Rechazo por cajón %', 'rechazo_cajon_pct']);

      const rcLivCant = pick(r, ['Rechazo por Livianos', 'rechazo_livianos', 'rechazo_livianos_cantidad', 'Rechazo por livianos']);
      const rcLivPct  = pick(r, ['Rechazo por Livianos %', 'rechazo_livianos_pct']);

      const rcPRCant  = pick(r, ['Rechazo por Pulmon roto', 'rechazo_pulmon_roto', 'rechazo_pulmon_roto_cantidad', 'Rechazo por pulmón roto']);
      const rcPRPct   = pick(r, ['Rechazo por Pulmon roto %', 'rechazo_pulmon_roto_pct']);

      const rcPCant   = pick(r, ['Rechazo por Pulmon', 'rechazo_pulmon', 'rechazo_pulmon_cantidad', 'Rechazo por pulmón']);
      const rcPPct    = pick(r, ['Rechazo por Pulmon %', 'rechazo_pulmon_pct']);

      // Celdas (ajusta al orden de tus columnas)
      tr.innerHTML = `
        <td>${fecha || ''}</td>
        <td class="text-right">${fmtInt(totalAnim)}</td>

        <td class="text-right">${fmtInt(halak)}</td>
        <td class="text-right">${fmtPct(pctHalak)}</td>

        <td class="text-right">${fmtInt(kosher)}</td>
        <td class="text-right">${fmtPct(pctKosher)}</td>

        <td class="text-right">${fmtInt(rech)}</td>
        <td class="text-right">${fmtPct(pctRech)}</td>

        <td class="text-right">${fmtInt(totalReg)}</td>
        <td class="text-right">${fmtPct(pctTotal)}</td>

        <td class="text-right">${fmtInt(rcCajCant)}</td>
        <td class="text-right">${fmtPct(rcCajPct)}</td>

        <td class="text-right">${fmtInt(rcLivCant)}</td>
        <td class="text-right">${fmtPct(rcLivPct)}</td>

        <td class="text-right">${fmtInt(rcPRCant)}</td>
        <td class="text-right">${fmtPct(rcPRPct)}</td>

        <td class="text-right">${fmtInt(rcPCant)}</td>
        <td class="text-right">${fmtPct(rcPPct)}</td>
      `;

      frag.appendChild(tr);
    });

    tbody.innerHTML = '';
    tbody.appendChild(frag);
  }

  function normalizeResponse(json) {
    // Puede venir como {items:[...]}, {rows:[...]}, o array simple
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.items)) return json.items;
    if (Array.isArray(json?.rows))  return json.rows;
    if (Array.isArray(json?.data))  return json.data;
    // último recurso: si tiene "items"/"rows" vacíos, devolvemos []
    return [];
  }

  async function onApply() {
    try {
      // Validación básica
      if (!selFrig.value || !selCli.value) {
        alert('Elegí frigorífico y cliente.');
        return;
      }

      const params = new URLSearchParams({
        page: '1',
        per_page: '1000',
        order: 'asc',
        frigorifico: selFrig.value,
        cliente: selCli.value
      });

      if (selTemp.value) {
        params.set('season_id', selTemp.value);
      } else {
        // Si el usuario eligió mes/año sin temporada, aplico solo si ambos están
        if (selMes.value && selAno.value) {
          params.set('month', selMes.value);
          params.set('year',  selAno.value);
        }
      }

      const url = `/api/faena/la-pampa?${params.toString()}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const json = await resp.json();
      const rows = normalizeResponse(json);

      renderRows(rows);
    } catch (e) {
      console.error('[apply_bind_v4] Error al aplicar:', e);
      tbody.innerHTML = `
        <tr><td colspan="18" class="text-center text-danger">
          Error al cargar datos. Revisá la consola/servidor.
        </td></tr>`;
    }
  }

  btn.addEventListener('click', onApply);
})();

