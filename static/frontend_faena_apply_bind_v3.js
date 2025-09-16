
/**
 * frontend_faena_apply_bind_v3.js
 * - Vincula el botón "Aplicar" con window.cargarDatosFaena(params)
 * - Tolerante con IDs y con ausencia de esa función (muestra por consola)
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

  function findAplicarBtn() {
    let btn = multiQuery(["#btnAplicar", "[data-role='aplicar']", "button.aplicar", ".btn-aplicar"]);
    if (btn) return btn;
    // Buscar por texto "Aplicar"
    const allBtns = Array.from(document.querySelectorAll("button, input[type=button]"));
    btn = allBtns.find(b => (b.textContent || b.value || "").trim().toLowerCase() === "aplicar");
    return btn || null;
  }

  const btnAplicar = findAplicarBtn();
  if (!btnAplicar) {
    console.warn("[frontend_faena_apply_bind_v3] No encontré botón Aplicar.");
    return;
  }

  btnAplicar.addEventListener("click", async () => {
    const frigorifico = parseInt(elFrig?.value || "", 10);
    const cliente     = parseInt(elCli ?.value || "", 10);
    const season_id   = elTemp && elTemp.value ? parseInt(elTemp.value, 10) : null;
    const month       = elMes  && elMes.value  ? parseInt(elMes.value, 10) : null;
    const year        = elAnio && elAnio.value ? parseInt(elAnio.value, 10) : null;

    if (!frigorifico || !cliente) {
      alert("Elegí frigorífico y cliente.");
      return;
    }
    if (!season_id && !(month && year)) {
      // Permitimos sin mes/año si el backend por temporada ya alcanza; 
      // pero si no hay temporada, requerimos mes+año
      alert("Elegí una temporada o (mes + año).");
      return;
    }

    const params = { frigorifico, cliente };
    if (season_id) {
      params.season_id = season_id;
    } else {
      params.month = month;
      params.year  = year;
    }

    if (typeof window.cargarDatosFaena === "function") {
      try {
        await window.cargarDatosFaena(params);
      } catch (e) {
        console.error("[frontend_faena_apply_bind_v3] Error al cargar datos:", e);
      }
    } else {
      // Fallback: solo hace fetch y loguea, por si falta tu renderer
      const usp = new URLSearchParams({ page:"1", per_page:"100", order:"asc", ...params });
      try {
        const r = await fetch(`/api/faena/la-pampa?${usp.toString()}`, {cache:"no-store"});
        const j = await r.json();
        console.log("Datos faena (fallback):", j);
        alert(`Llegaron ${j?.items?.length ?? 0} filas (ver consola).`);
      } catch (e) {
        console.error("[frontend_faena_apply_bind_v3] Fallback error:", e);
      }
    }
  });
})();
