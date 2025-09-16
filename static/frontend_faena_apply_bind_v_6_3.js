// v6.3 — FIX: cambio de headers según selector, funciona aunque el <select> no tenga value="t1/t2"
//           mantiene el thead ORIGINAL para "Tabla 1" y sólo reemplaza thead para "Tabla 2".
//           guarda el último dataset para re-render inmediato al cambiar de tabla.
//           spinner en Aplicar, CSV sin regex.

(() => {
  const CFG = window.FILTERS_CONFIG || {};
  const $ = (s) => document.querySelector(s);

  // Selectores (IDs existentes en tu vista)
  const elFrig = $(CFG.frigorifico || '#selFrigorifico');
  const elCli  = $(CFG.cliente     || '#selCliente');
  const elTemp = $(CFG.temporada   || '#temporadaSelect');
  const elMes  = $(CFG.mes         || '#filter-month');
  const elAno  = $(CFG.anio        || '#filter-year');
  const selTabla = $('#tabla-select'); // <select id="tabla-select">Tabla 1 / Tabla 2</select>

  // Tabla
  const tabla  = $('#tabla-faena');
  const thead  = tabla?.querySelector('thead');
  const tbody  = tabla?.querySelector('tbody');
  const originalTheadHTML = thead ? thead.innerHTML : '';

  // Botones
  const btnApply = $(CFG.aplicar || '#apply-filter');
  const btnCsv   = $('#download-csv');

  // Overlay opcional
  const overlay  = $('#loading-overlay');

  // Summary cards
  const sumTotal   = $('#sum-total');
  const sumHalak   = $('#sum-halak');
  const sumKosher  = $('#sum-kosher');
  const sumRechazo = $('#sum-rechazo');

  // Estado
  let lastRows = [];

  // Utils
  async function fetchJSON(url) {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
  const fmtInt = (v)=>{ const n = Number(v ?? 0); return Number.isFinite(n) ? n.toLocaleString('es-AR') : '0'; };
  const fmtPct = (v)=>{ const n = Number(v ?? 0); return `${n.toFixed(2)}%`; };
  const num    = (v)=>{ const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const pct    = (part,total)=>{ const t = num(total); return t>0 ? (num(part)*100)/t : 0; };

  // Loading UI
  const showOverlay = (v)=>{ if(!overlay) return; overlay.setAttribute('aria-hidden', v ? 'false' : 'true'); };
  const setBtnLoading = (v)=>{ if(!btnApply) return; btnApply.toggleAttribute('aria-busy', v); btnApply.disabled = !!v; };

  // Query builder
  const qs = (obj)=>{ const u = new URLSearchParams(); Object.entries(obj).forEach(([k,v])=>{ if(v!==undefined && v!==null && String(v).trim()!=='') u.append(k,v); }); return u.toString(); };
  const buildParams = ()=>{
    const p = { frigorifico: elFrig?.value, cliente: elCli?.value };
    if (elTemp?.value) p.season_id = elTemp.value; else { p.month = elMes?.value; p.year = elAno?.value; }
    return p;
  };

  // Encabezado tabla 2 (dos filas). Accepted = bloque único con BY y Halak.
  const setHeaderT2 = ()=>{
    if(!thead) return;
    thead.innerHTML = `
      <tr>
        <th rowspan="2">#</th>
        <th rowspan="2">Slaughter Date</th>
        <th rowspan="2">Heads</th>
        <th colspan="6">Dentition</th>
        <th colspan="8">Rejected</th>
        <th colspan="4">Accepted</th>
      </tr>
      <tr>
        <th>2–4 Teeth (qty)</th>
        <th>2–4 Teeth (%)</th>
        <th>6 Teeth (qty)</th>
        <th>6 Teeth (%)</th>
        <th>8 Teeth (qty)</th>
        <th>8 Teeth (%)</th>
        <th>Knocking box (qty)</th>
        <th>Knocking box (%)</th>
        <th>Stomach (qty)</th>
        <th>Stomach (%)</th>
        <th>Lung (qty)</th>
        <th>Lung (%)</th>
        <th>Total (qty)</th>
        <th>Total (%)</th>
        <th>Beit Yosef (qty)</th>
        <th>Beit Yosef (%)</th>
        <th>Halak (qty)</th>
        <th>Halak (%)</th>
      </tr>`;
  };

  // Normaliza fila del backend (admite variantes con/ sin acento)
  const normalize = (r)=>{
    const total   = num(r['Total Animales']);
    const halak   = num(r['Aptos Halak']);
    const kosher  = num(r['Aptos Kosher']);
    const rej     = num(r['Rechazos']);
    const rcajon  = num(r['Rechazo por cajon'] ?? r['Rechazo por cajón']);
    const rpanza  = num(r['Rechazo por panza']);
    const rlung   = num(r['Rechazo por Pulmon']) + num(r['Rechazo por Pulmon roto']);
    const d24     = num(r['faena_2y4_dientes']);
    const d6      = num(r['faena_6_dientes']);
    const d8      = num(r['faena_8_dientes']);
    const beit    = num(r['BEIT YOSEF']);
    return {
      fecha: r['Fecha Faena'], total, halak, kosher, rechazo: rej, rcajon, rpanza, rlung, d24, d6, d8, beit,
      d24_pct: pct(d24,total), d6_pct: pct(d6,total), d8_pct: pct(d8,total),
      rcajon_pct: pct(rcajon,total), rpanza_pct: pct(rpanza,total), rlung_pct: pct(rlung,total), rechazo_pct: pct(rej,total),
      beit_pct: pct(beit,total), halak_pct: pct(halak,total)
    };
  };

  // Render Tabla 1 (NO tocamos el thead: se mantiene el original del HTML)
  const renderRowsTabla1 = (rows)=>{
    if(!tbody) return; tbody.innerHTML=''; const frag = document.createDocumentFragment();
    rows.forEach((r)=>{ const c = normalize(r); const tr = document.createElement('tr'); tr.innerHTML = `
      <td>${c.fecha||''}</td>
      <td class="num">${fmtInt(c.total)}</td>
      <td class="num">${fmtInt(c.halak)}</td>
      <td class="num">${fmtPct(c.halak_pct)}</td>
      <td class="num">${fmtInt(c.kosher)}</td>
      <td class="num">${fmtPct(pct(c.kosher,c.total))}</td>
      <td class="num">${fmtInt(c.rechazo)}</td>
      <td class="num">${fmtPct(c.rechazo_pct)}</td>
      <td class="num">${fmtInt(num(r['Total Registradas']))}</td>
      <td class="num">${fmtPct(num(r['% Total']))}</td>
      <td class="num">${fmtInt(c.rcajon)}</td>
      <td class="num">${fmtPct(c.rcajon_pct)}</td>
      <td class="num">${fmtInt(num(r['Rechazo por Livianos']))}</td>
      <td class="num">${fmtPct(pct(num(r['Rechazo por Livianos']), c.total))}</td>
      <td class="num">${fmtInt(num(r['Rechazo por Pulmon roto']))}</td>
      <td class="num">${fmtPct(pct(num(r['Rechazo por Pulmon roto']), c.total))}</td>
      <td class="num">${fmtInt(num(r['Rechazo por Pulmon']))}</td>
      <td class="num">${fmtPct(pct(num(r['Rechazo por Pulmon']), c.total))}</td>`; frag.appendChild(tr); });
    tbody.appendChild(frag);
  };

  // Render Tabla 2 (dos filas de encabezado + Accepted bloque)
  const renderRowsTabla2 = (rows)=>{
    if(!tbody) return; setHeaderT2(); tbody.innerHTML=''; const frag = document.createDocumentFragment();
    rows.forEach((r,i)=>{ const c = normalize(r); const tr = document.createElement('tr'); tr.innerHTML = `
      <td>${i+1}</td>
      <td>${c.fecha||''}</td>
      <td class="num">${fmtInt(c.total)}</td>
      <td class="num">${fmtInt(c.d24)}</td>
      <td class="num">${fmtPct(c.d24_pct)}</td>
      <td class="num">${fmtInt(c.d6)}</td>
      <td class="num">${fmtPct(c.d6_pct)}</td>
      <td class="num">${fmtInt(c.d8)}</td>
      <td class="num">${fmtPct(c.d8_pct)}</td>
      <td class="num">${fmtInt(c.rcajon)}</td>
      <td class="num">${fmtPct(c.rcajon_pct)}</td>
      <td class="num">${fmtInt(c.rpanza)}</td>
      <td class="num">${fmtPct(c.rpanza_pct)}</td>
      <td class="num">${fmtInt(c.rlung)}</td>
      <td class="num">${fmtPct(c.rlung_pct)}</td>
      <td class="num">${fmtInt(c.rechazo)}</td>
      <td class="num">${fmtPct(c.rechazo_pct)}</td>
      <td class="num">${fmtInt(c.beit)}</td>
      <td class="num">${fmtPct(c.beit_pct)}</td>
      <td class="num">${fmtInt(c.halak)}</td>
      <td class="num">${fmtPct(c.halak_pct)}</td>`; frag.appendChild(tr); });
    tbody.appendChild(frag);
  };

  // Modo normalizado: acepta value="t1/t2" o texto "Tabla 1/2"
  function getMode(){
    const v = (selTabla?.value || 't1').toLowerCase();
    if (v.includes('2')) return 't2';
    return 't1';
  }

  // Render & resumen
  const render = (rows)=>{
    if (!thead) return;
    if (getMode()==='t2') {
      renderRowsTabla2(rows);
    } else {
      // restaurar encabezado original de la vista
      if (thead && originalTheadHTML) thead.innerHTML = originalTheadHTML;
      renderRowsTabla1(rows);
    }
  };

  const updateSummary = (rows)=>{
    let total=0,halak=0,kosher=0,rechazo=0;
    rows.forEach((r)=>{ total+=num(r['Total Animales']); halak+=num(r['Aptos Halak']); kosher+=num(r['Aptos Kosher']); rechazo+=num(r['Rechazos']); });
    if(sumTotal)   sumTotal.textContent=`${fmtInt(total)} - 100%`;
    if(sumHalak)   sumHalak.textContent=`${fmtInt(halak)} - ${fmtPct(pct(halak,total))}`;
    if(sumKosher)  sumKosher.textContent=`${fmtInt(kosher)} - ${fmtPct(pct(kosher,total))}`;
    if(sumRechazo) sumRechazo.textContent=`${fmtInt(rechazo)} - ${fmtPct(pct(rechazo,total))}`;
  };

  // Carga de datos
  const cargarDatos = async()=>{
    const url = `/api/faena/la-pampa?${qs(buildParams())}`;
    showOverlay(true); setBtnLoading(true);
    try {
      const data = await fetchJSON(url);
      const rows = Array.isArray(data?.rows)? data.rows : [];
      lastRows = rows; // guardamos
      render(rows);
      updateSummary(rows);
    }
    catch(e){ console.error('[faena] error', e); if(tbody) tbody.innerHTML = `<tr><td colspan=\"24\" style=\"text-align:center\">No se pudieron cargar los datos.</td></tr>`; updateSummary([]); }
    finally { showOverlay(false); setBtnLoading(false); }
  };

  // CSV sin regex (robusto)
  function buildCsv_T1(rows){
    const header = [
      'Fecha de Faena','Total de Cabezas','Halak (Total)','Halak (%)','Kosher (Total)','Kosher (%)','Rechazo (Total)','Rechazo (%)','Total Registradas','% Total','Rechazo por cajón (Cant.)','Rechazo por cajón (%)','Rechazo por livianos (Cant.)','Rechazo por livianos (%)','Rechazo por pulmón roto (Cant.)','Rechazo por pulmón roto (%)','Rechazo por pulmón (Cant.)','Rechazo por pulmón (%)'
    ];
    const lines=[header];
    const esc=(v)=>{ if(v==null) return ''; let s=String(v); if(s.includes('"')) s=s.split('"').join('""'); const needs=s.includes(',')||s.includes('\n')||s.includes(';'); return needs?`"${s}"`:s; };
    rows.forEach((r)=>{
      const total=num(r['Total Animales']); const halak=num(r['Aptos Halak']); const kosher=num(r['Aptos Kosher']); const rech=num(r['Rechazos']);
      const arr=[ r['Fecha Faena']||'', total, halak, pct(halak,total).toFixed(2), kosher, pct(kosher,total).toFixed(2), rech, pct(rech,total).toFixed(2), num(r['Total Registradas']), num(r['% Total']).toFixed(2), num(r['Rechazo por cajón']??r['Rechazo por cajon']), pct(num(r['Rechazo por cajón']??r['Rechazo por cajon']), total).toFixed(2), num(r['Rechazo por Livianos']), pct(num(r['Rechazo por Livianos']), total).toFixed(2), num(r['Rechazo por Pulmon roto']), pct(num(r['Rechazo por Pulmon roto']), total).toFixed(2), num(r['Rechazo por Pulmon']), pct(num(r['Rechazo por Pulmon']), total).toFixed(2) ];
      lines.push(arr.map(esc));
    });
    return lines.map(r=>r.join(',')).join('\n');
  }
  function buildCsv_T2(rows){
    const header=['#','Slaughter Date','Heads','2-4 Teeth (qty)','2-4 Teeth (%)','6 Teeth (qty)','6 Teeth (%)','8 Teeth (qty)','8 Teeth (%)','Rejected Knocking box (qty)','Rejected Knocking box (%)','Rejected Stomach (qty)','Rejected Stomach (%)','Rejected Lung (qty)','Rejected Lung (%)','Rejected Total (qty)','Rejected Total (%)','Beit Yosef (qty)','Beit Yosef (%)','Halak (qty)','Halak (%)'];
    const lines=[header];
    const esc=(v)=>{ if(v==null) return ''; let s=String(v); if(s.includes('"')) s=s.split('"').join('""'); const needs=s.includes(',')||s.includes('\n')||s.includes(';'); return needs?`"${s}"`:s; };
    rows.forEach((r,i)=>{ const c=normalize(r); lines.push([ i+1, c.fecha||'', c.total, c.d24, c.d24_pct.toFixed(2), c.d6, c.d6_pct.toFixed(2), c.d8, c.d8_pct.toFixed(2), c.rcajon, c.rcajon_pct.toFixed(2), c.rpanza, c.rpanza_pct.toFixed(2), c.rlung, c.rlung_pct.toFixed(2), c.rechazo, c.rechazo_pct.toFixed(2), c.beit, c.beit_pct.toFixed(2), c.halak, c.halak_pct.toFixed(2) ].map(esc)); });
    return lines.map(r=>r.join(',')).join('\n');
  }

  const onDownloadCsv = async()=>{
    const url = `/api/faena/la-pampa?${qs(buildParams())}`; showOverlay(true);
    try { const data = await fetchJSON(url); const rows = Array.isArray(data?.rows)? data.rows : []; const csv = (getMode()==='t2') ? buildCsv_T2(rows) : buildCsv_T1(rows); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=(getMode()==='t2'?'faena_table2':'faena_table1')+'.csv'; document.body.appendChild(a); a.click(); a.remove(); }
    catch(e){ console.error('[faena] csv', e); }
    finally { showOverlay(false); }
  };

  // Eventos
  btnApply?.addEventListener('click', ()=>{ cargarDatos(); });
  btnCsv  ?.addEventListener('click', onDownloadCsv);
  selTabla?.addEventListener('change', ()=>{ render(lastRows); });
  [elFrig, elCli, elTemp, elMes, elAno].forEach((el)=> el?.addEventListener('change', ()=>{ if(el===elTemp){ if(elMes) elMes.disabled=!!elTemp.value; if(elAno) elAno.disabled=!!elTemp.value; } }));

  // Init (no cambia filtros)
  try { cargarDatos(); } catch(e){ console.error(e); }
})();
