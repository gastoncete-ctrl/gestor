
// temporadas_loader_v2.js
// Mantiene deshabilitado el selector de Temporada hasta que se eligen
// Frigorífico y Cliente. Luego carga las temporadas desde el backend.
// Robusto a diferentes formas de respuesta: {rows:[...]}, {data:[...]}, [...]

(function () {
  function $(id) { return document.getElementById(id); }
  function findByIds(ids) {
    for (const id of ids) {
      const el = $(id);
      if (el) return el;
    }
    return null;
  }

  // IDs compatibles (ajusta aquí si tus IDs cambian)
  const selFrig = findByIds(["selFrigorifico", "frigorificoSelect", "frigorifico"]);
  const selCli  = findByIds(["selCliente", "clienteSelect", "cliente"]);
  const selTemp = findByIds(["selTemporada", "temporadaSelect", "temporada"]);

  if (!selTemp) return; // no hay selector de temporada en el DOM

  // Utilidades UI
  function wipeOptions(select) { select.innerHTML = ""; }
  function opt(text, val="") {
    const o = document.createElement("option");
    o.textContent = text;
    o.value = val;
    return o;
  }
  function disableTemporada(msg) {
    wipeOptions(selTemp);
    selTemp.appendChild(opt(msg || "— Seleccioná frigorífico y cliente —", ""));
    selTemp.disabled = true;
  }
  function enableTemporadaWithPlaceholder() {
    wipeOptions(selTemp);
    selTemp.appendChild(opt("— Seleccionar temporada —", ""));
    selTemp.disabled = false;
  }

  // Estado inicial
  disableTemporada("— Seleccioná frigorífico y cliente —");

  function parseDate(d) {
    // Acepta Date, 'YYYY-MM-DD', 'DD-MM-YYYY', o 'YYYY/MM/DD'
    if (d instanceof Date) return d;
    if (typeof d === "number") return new Date(d);
    if (typeof d !== "string") return null;

    // Normaliza separadores
    const s = d.replace(/\./g, "-").replace(/\//g, "-");
    let y, m, dd;
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      [y, m, dd] = s.split("-").map(Number);
      return new Date(y, m - 1, dd);
    }
    // DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      [dd, m, y] = s.split("-").map(Number);
      return new Date(y, m - 1, dd);
    }
    const t = Date.parse(d);
    if (!isNaN(t)) return new Date(t);
    return null;
  }
  function fmtDMY(d) {
    const pad = n => String(n).padStart(2, "0");
    return `${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()}`;
  }

  async function cargarTemporadas() {
    // Necesita frig y cliente
    const frigId = selFrig && selFrig.value ? parseInt(selFrig.value, 10) : NaN;
    const cliId  = selCli  && selCli.value  ? parseInt(selCli.value, 10)  : NaN;

    if (!frigId || !cliId || isNaN(frigId) || isNaN(cliId)) {
      disableTemporada("— Seleccioná frigorífico y cliente —");
      return;
    }

    enableTemporadaWithPlaceholder();

    const url = `/api/faena/la-pampa/temporadas?frigorifico=${encodeURIComponent(frigId)}&cliente=${encodeURIComponent(cliId)}`;
    try {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Soporta varias formas de respuesta
      let items = [];
      if (Array.isArray(data)) items = data;
      else if (Array.isArray(data.rows)) items = data.rows;
      else if (Array.isArray(data.data)) items = data.data;

      wipeOptions(selTemp);
      if (!items.length) {
        selTemp.appendChild(opt("— Sin temporadas para la selección —", ""));
        selTemp.disabled = true;
        return;
      }
      // Orden opcional por fecha_inicio desc
      items.sort((a,b)=>{
        const ai = parseDate(a.fecha_inicio || a.inicio || a.start);
        const bi = parseDate(b.fecha_inicio || b.inicio || b.start);
        return (bi?.getTime()||0)-(ai?.getTime()||0);
      });

      selTemp.appendChild(opt("— Seleccionar temporada —", ""));
      for (const r of items) {
        const id    = r.id ?? r.id_temporada ?? r.temp_id ?? "";
        const d1    = parseDate(r.fecha_inicio || r.inicio || r.start);
        const d2    = parseDate(r.fecha_final  || r.fin    || r.end);
        const lIni  = d1 ? fmtDMY(d1) : (r.fecha_inicio || r.inicio || r.start || "?");
        const lFin  = d2 ? fmtDMY(d2) : (r.fecha_final  || r.fin    || r.end   || "?");
        const label = `Temporada (${lIni} a ${lFin})`;
        selTemp.appendChild(opt(label, String(id)));
      }
      selTemp.disabled = false;
    } catch (err) {
      console.error("Error al cargar temporadas:", err);
      disableTemporada("— Error al cargar —");
    }
  }

  function onFilterChange() {
    // Cada vez que cambia frig o cliente, recalculamos
    cargarTemporadas();
  }

  if (selFrig)  selFrig.addEventListener("change", onFilterChange);
  if (selCli)   selCli.addEventListener("change", onFilterChange);

  // Exponer por si se necesita recargar manualmente
  window.recargarTemporadas = cargarTemporadas;
})();
