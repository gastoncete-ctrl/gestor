// v6 — Spinner en "Aplicar" + selector de tabla (Tabla 1 / Tabla 2)
// - Mantiene la API existente (/api/faena/la-pampa)
// - Elimina la dependencia del botón "Ir al último mes faenado" (no lo usa)
// - Tabla 1 = igual a la anterior
// - Tabla 2 = encabezados estilo planilla PDF; se rellenan solo los campos disponibles

(() => {
  const CFG = window.FILTERS_CONFIG || {};
  const $ = (s) => document.querySelector(s);

  // Selectores
  const elFrig = $(CFG.frigorifico || '#selFrigorifico');
  const elCli  = $(CFG.cliente     || '#selCliente');
  const elTemp = $(CFG.temporada   || '#temporadaSelect');
  const elMes  = $(CFG.mes         || '#filter-month');
  const elAno  = $(CFG.anio        || '#filter-year');
  const selTabla = $('#tabla-select'); // NUEVO: <select id="tabla-select">Tabla 1 / Tabla 2</select>

  // Tabla
  const tabla  = $('#tabla-faena');
  const thead  = tabla?.querySelector('thead');
  const tbody  = tabla?.querySelector('tbody');

  // Botones
  const btnApply = $(CFG.aplicar || '#apply-filter');
  const btnCsv   = $('#download-csv');

  // Overlay global existente (si lo tenés)
  const overlay  = $('#loading-overlay');

  // Summary cards
  const sumTotal   = $('#sum-total');
  const sumHalak   = $('#sum-halak');
  const sumKosher  = $('#sum-kosher');
  const sumRechazo = $('#sum-rechazo');

  // Utils
  async function fetchJSON(url) {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  function fmtInt(v){ const n = Number(v ?? 0); return Number.isFinite(n) ? n.toLocaleString('es-AR') : '0'; }
  function fmtPct(v){ const n = Number(v ?? 0); return `${n.toFixed(2)}%`; }
  function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function pct(part, total){ const t = num(total); return t>0 ? (num(part)*100)/t : 0; }

  // Loading UI
  function showOverlay(v){ if(!overlay) return; overlay.setAttribute('aria-hidden', v ? 'false' : 'true'); }
  function setBtnLoading(v){ if(!btnApply) return; btnApply.toggleAttribute('aria-busy', v); btnApply.disabled = !!v; }

  // Query builder
  function qs(obj){ const u = new URLSearchParams(); Object.entries(obj).forEach(([k,v])=>{ if(v!==undefined && v!==null && String(v).trim()!=='') u.append(k,v); }); return u.toString(); }
  function buildParams(){
    const p = {
      frigorifico: elFrig?.value,
      cliente:     elCli?.value,
    };
    if (elTemp?.value) p.season_id = elTemp.value; else { p.month = elMes?.value; p.year = elAno?.value; }
    return p;
  }

  // Encabezados
  const HEADER_T1 = [
    'Fecha de Faena','Total de Cabezas','Halak (Total)','Halak (%)','Kosher (Total)','Kosher (%)','Rechazo (Total)','Rechazo (%)','Total Registradas','% Total','Rechazo por cajón (Cant.)','Rechazo por cajón (%)','Rechazo por livianos (Cant.)','Rechazo por livianos (%)','Rechazo por pulmón roto (Cant.)','Rechazo por pulmón roto (%)','Rechazo por pulmón (Cant.)','Rechazo por pulmón (%)'
  ];

  // Inspirado en el PDF adjunto (cabeceras simplificadas)
  const HEADER_T2 = [
    '#','Slaughter Date','Heads','2-4 Teeth (qty)','2-4 Teeth (%)','6 Teeth (qty)','6 Teeth (%)','8 Teeth (qty)','8 Teeth (%)','Rejected – Knocking box (qty)','Rejected – Knocking box (%)','Rejected – Stomach (qty)','Rejected – Stomach (%)','Rejected – Lung (qty)','Rejected – Lung (%)','Rejected – Total (qty)','Rejected – Total (%)','Beit Yosef (qty)','Beit Yosef (%)','Halak (qty)','Halak (%)','Accepted Total (qty)','Accepted Total (%)'
  ];

  function setHeader(arr){ if(!thead) return; const tr = document.createElement('tr'); tr.innerHTML = arr.map(t=>`<th>${t}</th>`).join(''); thead.innerHTML=''; thead.appendChild(tr); }

  // Normaliza fila del backend
  function normalize(r){
    const total   = num(r['Total Animales']);
    const halak   = num(r['Aptos Halak']);
    const kosher  = num(r['Aptos Kosher']);
    const rej     = num(r['Rechazos']);

    const rcajon  = num(r['Rechazo por cajón']);
    const rliv    = num(r['Rechazo por Livianos']);
    const rpulR   = num(r['Rechazo por Pulmon roto']);
    const rpul    = num(r['Rechazo por Pulmon']);

    return {
      fecha: r['Fecha Faena'],
      total, halak, halak_pct: pct(halak,total), kosher, kosher_pct: pct(kosher,total),
      rechazo: rej, rechazo_pct: pct(rej,total),
      registradas: num(r['Total Registradas']), pctTotal: num(r['% Total']),
      rcajon, rcajon_pct: pct(rcajon,total),
      rliv,   rliv_pct: pct(rliv,total),
      rpulR,  rpulR_pct: pct(rpulR,total),
      rpul,   rpul_pct: pct(rpul,total),
    };
  }

  // Tabla 1 (igual que antes)
  function renderRowsTabla1(rows){
    if(!tbody) return;
    setHeader(HEADER_T1);
    tbody.innerHTML='';
    const frag = document.createDocumentFragment();
    rows.forEach((r)=>{
      const c = normalize(r);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.fecha||''}</td>
        <td class="num">${fmtInt(c.total)}</td>
        <td class="num">${fmtInt(c.halak)}</td>
        <td class="num">${fmtPct(c.halak_pct)}</td>
        <td class="num">${fmtInt(c.kosher)}</td>
        <td class="num">${fmtPct(c.kosher_pct)}</td>
        <td class="num">${fmtInt(c.rechazo)}</td>
        <td class="num">${fmtPct(c.rechazo_pct)}</td>
        <td class="num">${fmtInt(c.registradas)}</td>
        <td class="num">${fmtPct(c.pctTotal)}</td>
        <td class="num">${fmtInt(c.rcajon)}</td>
        <td class="num">${fmtPct(c.rcajon_pct)}</td>
        <td class="num">${fmtInt(c.rliv)}</td>
        <td class="num">${fmtPct(c.rliv_pct)}</td>
        <td class="num">${fmtInt(c.rpulR)}</td>
        <td class="num">${fmtPct(c.rpulR_pct)}</td>
        <td class="num">${fmtInt(c.rpul)}</td>
        <td class="num">${fmtPct(c.rpul_pct)}</td>`;
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
  }

  // Tabla 2 (formato PDF). Los campos de dentición y Beit Yosef no existen aún en los datos; se dejan en blanco (—) a la espera de backend.
  function renderRowsTabla2(rows){
    if(!tbody) return;
    setHeader(HEADER_T2);
    tbody.innerHTML='';
    const frag = document.createDocumentFragment();

    rows.forEach((r, i)=>{
      const c = normalize(r);
      const acceptedQty = c.total - c.rechazo; // simplificación: aceptados = total - rechazados
      const acceptedPct = pct(acceptedQty, c.total);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i+1}</td>
        <td>${c.fecha||''}</td>
        <td class="num">${fmtInt(c.total)}</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">${fmtInt(c.rcajon)}</td>
        <td class="num">${fmtPct(c.rcajon_pct)}</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">${fmtInt(c.rpul + c.rpulR)}</td>
        <td class="num">${fmtPct(pct(c.rpul + c.rpulR, c.total))}</td>
        <td class="num">${fmtInt(c.rechazo)}</td>
        <td class="num">${fmtPct(c.rechazo_pct)}</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">${fmtInt(c.halak)}</td>
        <td class="num">${fmtPct(c.halak_pct)}</td>
        <td class="num">${fmtInt(acceptedQty)}</td>
        <td class="num">${fmtPct(acceptedPct)}</td>`;
      frag.appendChild(tr);
    });

    tbody.appendChild(frag);
  }

  function render(rows){
    const mode = selTabla?.value || 't1';
    if (mode === 't2') renderRowsTabla2(rows); else renderRowsTabla1(rows);
  }

  function updateSummary(rows){
    let total=0, halak=0, kosher=0, rechazo=0;
    rows.forEach((r)=>{ total+=num(r['Total Animales']); halak+=num(r['Aptos Halak']); kosher+=num(r['Aptos Kosher']); rechazo+=num(r['Rechazos']); });
    if(sumTotal)   sumTotal.textContent   = `${fmtInt(total)} - 100%`;
    if(sumHalak)   sumHalak.textContent   = `${fmtInt(halak)} - ${fmtPct(pct(halak,total))}`;
    if(sumKosher)  sumKosher.textContent  = `${fmtInt(kosher)} - ${fmtPct(pct(kosher,total))}`;
    if(sumRechazo) sumRechazo.textContent = `${fmtInt(rechazo)} - ${fmtPct(pct(rechazo,total))}`;
  }

  async function cargarDatos(){
    const url = `/api/faena/la-pampa?${qs(buildParams())}`;
    showOverlay(true); setBtnLoading(true);
    try {
      const data = await fetchJSON(url);
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      render(rows);
      updateSummary(rows);
    } catch (e){
      console.error('[faena] error', e);
      if (tbody) tbody.innerHTML = `<tr><td colspan="24" style="text-align:center">No se pudieron cargar los datos.</td></tr>`;
      updateSummary([]);
    } finally {
      showOverlay(false); setBtnLoading(false);
    }
  }

  // CSV: exporta lo que esté visible (Tabla 1 o 2) — opcionalmente podés mantener tu export previo
  async function onDownloadCsv(){
    const url = `/api/faena/la-pampa?${qs(buildParams())}`;
    showOverlay(true);
    try {
      const data = await fetchJSON(url);
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      const mode = selTabla?.value || 't1';
      const lines = [];
      if (mode==='t2') lines.push(HEADER_T2); else lines.push(HEADER_T1);
      rows.forEach((r,i)=>{
        const c = normalize(r);
        if (mode==='t2'){
          const acceptedQty = c.total - c.rechazo;
          const acceptedPct = pct(acceptedQty, c.total);
          lines.push([
            i+1, c.fecha||'', c.total,
            '', '', '', '', '', '',
            c.rcajon, c.rcajon_pct.toFixed(2),
            '', '', (c.rpul + c.rpulR), pct(c.rpul + c.rpulR, c.total).toFixed(2),
            c.rechazo, c.rechazo_pct.toFixed(2),
            '', '', c.halak, c.halak_pct.toFixed(2),
            acceptedQty, acceptedPct.toFixed(2)
          ]);
        } else {
          lines.push([
            c.fecha, c.total,
            c.halak, c.halak_pct.toFixed(2),
            c.kosher, c.kosher_pct.toFixed(2),
            c.rechazo, c.rechazo_pct.toFixed(2),
            c.registradas, c.pctTotal.toFixed(2),
            c.rcajon, c.rcajon_pct.toFixed(2),
            c.rliv, c.rliv_pct.toFixed(2),
            c.rpulR, c.rpulR_pct.toFixed(2),
            c.rpul, c.rpul_pct.toFixed(2)
          ]);
        }
      });
      const csv = lines.map(row => row.map(v => { if(v==null) return ''; const s = String(v).replace(/"/g,'""'); return /[",\n;]/.test(s) ? `"${s}"` : s; }).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (selTabla?.value==='t2'?'faena_table2':'faena_table1')+ '.csv';
      document.body.appendChild(a); a.click(); a.remove();
    } catch(e){ console.error('[faena] csv', e); }
    finally { showOverlay(false); }
  }

  function onApply(){ cargarDatos(); }

  // Eventos
  if(btnApply) btnApply.addEventListener('click', onApply);
  if(btnCsv)   btnCsv  .addEventListener('click', onDownloadCsv);
  selTabla?.addEventListener('change', cargarDatos);
  [elFrig, elCli, elTemp, elMes, elAno].forEach((el)=> el?.addEventListener('change', ()=>{ if(el===elTemp){ elMes.disabled=!!elTemp.value; elAno.disabled=!!elTemp.value; } }));

  // Init
  try { cargarDatos(); } catch(e){ console.error(e); }
})();
