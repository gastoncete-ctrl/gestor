
/**
 * filters_month_year_loader_v4.js
 * - Llena los selects de Mes y Año en función de frigorífico/cliente
 * - Restringe por temporada (si está elegida)
 * - Tolerante con IDs y con el formato de la respuesta del backend
 */
(function () {
  const $ = (sel) => document.querySelector(sel);

  function multiQuery(selectors) {
    for (const s of selectors) {
      const el = $(s);
      if (el) return el;
    }
    return null;
  }

  const elFrig = multiQuery(["#selFrigorifico", "#frigorificoSelect", "#frigorifico"]);
  const elCli  = multiQuery(["#selCliente", "#clienteSelect", "#cliente"]);
  const elTemp = multiQuery(["#selTemporada", "#temporadaSelect", "#temporada"]);
  const elMes  = multiQuery(["#selMes", "#mesSelect", "#mes"]);
  const elAnio = multiQuery(["#selAnio", "#anioSelect", "#anio", "#anioSelectFilter"]);

  if (!elFrig || !elCli || !elMes || !elAnio) {
    console.warn("[filters_month_year_loader_v4] No encontré uno o más selects (frigorifico/cliente/mes/año).");
    return;
  }

  const MONTH_NAMES = [
    "", "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];

  function clearAndDisable(sel, placeholder) {
    sel.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder || "—";
    sel.appendChild(opt);
    sel.disabled = true;
  }

  function fillSelect(sel, list, placeholder, mapFn) {
    sel.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder || "—";
    sel.appendChild(opt0);
    if (Array.isArray(list) && list.length) {
      for (const v of list) {
        const opt = document.createElement("option");
        const value = typeof v === "object" ? (v.value ?? v.id ?? v.m ?? v.month) : v;
        const labelRaw = typeof v === "object" ? (v.label ?? v.name ?? v.text ?? v.value ?? value) : v;
        const label = mapFn ? mapFn(labelRaw, value) : labelRaw;
        opt.value = value;
        opt.textContent = String(label);
        sel.appendChild(opt);
      }
      sel.disabled = false;
    } else {
      sel.disabled = true;
    }
  }

  function parseMonthsYears(resp) {
    // Tolerar varias formas
    let months = resp?.months ?? resp?.meses ?? resp?.Months ?? resp?.MonthsList;
    let years  = resp?.years  ?? resp?.anios ?? resp?.Years  ?? resp?.YearsList;

    // Si vino rows [{y,m}] o similar
    if ((!months || !years) && Array.isArray(resp?.rows)) {
      const setM = new Set();
      const setY = new Set();
      for (const r of resp.rows) {
        if (r.m != null || r.month != null) setM.add(Number(r.m ?? r.month));
        if (r.y != null || r.year  != null) setY.add(Number(r.y ?? r.year));
      }
      months = months || Array.from(setM);
      years  = years  || Array.from(setY);
    }
    // Si vino data
    if ((!months || !years) && Array.isArray(resp?.data)) {
      const setM = new Set();
      const setY = new Set();
      for (const r of resp.data) {
        if (r.m != null || r.month != null) setM.add(Number(r.m ?? r.month));
        if (r.y != null || r.year  != null) setY.add(Number(r.y ?? r.year));
      }
      months = months || Array.from(setM);
      years  = years  || Array.from(setY);
    }

    // Normalizar y ordenar
    months = Array.isArray(months) ? months.map(Number).filter(Boolean).sort((a,b)=>a-b) : [];
    years  = Array.isArray(years)  ? years.map(Number).filter(Boolean).sort((a,b)=>b-a) : [];
    return { months, years };
  }

  async function updateMonthsYears() {
    const frig = parseInt(elFrig.value || "", 10);
    const cli  = parseInt(elCli.value  || "", 10);
    const temp = elTemp ? parseInt(elTemp.value || "", 10) : null;

    if (!frig || !cli) {
      clearAndDisable(elMes,  "— Mes —");
      clearAndDisable(elAnio, "— Año —");
      return;
    }

    let url = `/api/faena/la-pampa/meses-anios?frigorifico=${frig}&cliente=${cli}`;
    if (temp) url += `&season_id=${temp}`;

    try {
      const r = await fetch(url, {cache:"no-store"});
      const j = await r.json();
      const { months, years } = parseMonthsYears(j);

      fillSelect(elMes, months, "— Mes —", (raw, val) => MONTH_NAMES[Number(val) || Number(raw) || 0] || raw);
      fillSelect(elAnio, years,  "— Año —");

      // Si no hay nada, deshabilitar
      if (!months.length) elMes.disabled = true;
      if (!years.length)  elAnio.disabled = true;
    } catch (e) {
      console.error("[filters_month_year_loader_v4] Error al cargar meses/años:", e);
      clearAndDisable(elMes,  "— Mes —");
      clearAndDisable(elAnio, "— Año —");
    }
  }

  // Estados iniciales
  clearAndDisable(elMes,  "— Mes —");
  clearAndDisable(elAnio, "— Año —");

  // Eventos
  elFrig.addEventListener("change", updateMonthsYears);
  elCli .addEventListener("change", updateMonthsYears);
  if (elTemp) elTemp.addEventListener("change", updateMonthsYears);

  // Si ya están elegidos al cargar, intentá poblar
  if (elFrig.value && elCli.value) updateMonthsYears();
})();
