(() => {
  if (window.__truthMeterLoaded) return;
  window.__truthMeterLoaded = true;

  let claims = [];
  let captionCounter = 0;
  let lastCaptionText = "";
  let lastCaptionAt = -1;

  const state = {
    open: true,
    minimized: false,
    analysis: true,
    selected: null,
    reviewed: {},
    mode: "LEGENDAS REAIS"
  };

  const host = document.createElement("div");
  host.id = "truthmeter-host";
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const shadowStyle = document.createElement("link");
  shadowStyle.rel = "stylesheet";
  shadowStyle.href = chrome.runtime.getURL("styles.css");
  shadow.appendChild(shadowStyle);

  const root = document.createElement("div");
  root.className = "tm-root";
  shadow.appendChild(root);

  const video = () => document.querySelector("video");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
  const statusClass = (status) => ({ CORROBORADA: "good", CONTRADITA: "bad", PARCIAL: "partial", INDETERMINADA: "unknown" }[status] || "unknown");
  const selectedClaim = () => claims.find((claim) => claim.id === state.selected) || claims[claims.length - 1] || null;

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function readCaptionText() {
    const nodes = [...document.querySelectorAll(".ytp-caption-segment")];
    const text = nodes.map((node) => node.textContent.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    return text;
  }

  function captureCurrentCaption() {
    if (!state.analysis) return;
    const player = video();
    const text = readCaptionText();
    if (!player || !text || text === lastCaptionText) return;

    const now = player.currentTime || 0;
    if (text === lastCaptionText || Math.abs(now - lastCaptionAt) < 0.4) return;
    lastCaptionText = text;
    lastCaptionAt = now;

    const claim = {
      id: `caption-${++captionCounter}`,
      speaker: "Desconhecido",
      speakerKey: "unknown",
      start: now,
      end: now + 1,
      text,
      quote: text,
      status: "INDETERMINADA",
      score: null,
      evidence: "Trecho capturado diretamente da legenda exibida no YouTube.",
      source: "",
      reason: "A legenda foi registrada, mas ainda não passou por verificação factual.",
      confidence: "Não avaliada"
    };
    claims.push(claim);
    if (claims.length > 100) claims.shift();
    state.selected = claim.id;
    render();
  }

  function render() {
    const selected = selectedClaim();
    const current = video()?.currentTime || 0;
    const active = claims.find((claim) => current >= claim.start && current <= claim.end + 2) || selected;
    const verified = claims.filter((claim) => claim.score !== null);
    const score = verified.length ? Math.round(verified.reduce((sum, claim) => sum + claim.score, 0) / verified.length) : null;
    const unknownCount = claims.length;

    root.innerHTML = `
      <div class="tm-launcher" data-action="toggle-open" title="Abrir TruthMeter">TM</div>
      ${state.open ? `
      <section class="tm-shell ${state.minimized ? "is-minimized" : ""}">
        <header class="tm-header">
          <div class="tm-brand"><span class="tm-dot"></span><div><strong>TRUTHMETER</strong><small>legendas reais do YouTube</small></div></div>
          <div class="tm-header-actions"><span class="tm-live"><i></i>${state.analysis ? "Capturando legenda" : "Pausada"}</span><button data-action="toggle-analysis" class="tm-icon">${state.analysis ? "Ⅱ" : "▶"}</button><button data-action="minimize" class="tm-icon">—</button><button data-action="close" class="tm-icon">×</button></div>
        </header>
        ${state.minimized ? `<div class="tm-minimized-bar"><span>${claims.length ? `${claims.length} legendas` : "Aguardando legenda"}</span><button data-action="expand">Expandir painel</button></div>` : `
        <div class="tm-body">
          <aside class="tm-speaker speaker-left"><div class="speaker-label"><span class="avatar avatar-red">?</span><span>PARTICIPANTE</span></div><div class="big-count gray">—<small>SEM ATRIBUIÇÃO</small></div><div class="small-count gray">A voz ainda não foi identificada</div></aside>
          <main class="tm-center"><div class="tm-kicker">${state.mode} · ${claims.length} capturadas</div><div class="gauge"><div class="gauge-arc"></div><div class="gauge-ticks"><span>0</span><span>50</span><span>100</span></div><div class="gauge-value">${score === null ? "—" : score}<small>${score === null ? "SEM VERIFICAÇÃO" : "ÍNDICE"}</small></div><div class="gauge-needle" style="transform: rotate(${score === null ? -90 : -90 + score * 1.8}deg)"></div></div><div class="tm-now"><span class="pulse"></span>${active ? `Legenda capturada: ${escapeHtml(active.text.slice(0, 72))}` : "Aguardando legenda do YouTube"}</div></main>
          <aside class="tm-speaker speaker-right"><div class="speaker-label"><span>SEM ATRIBUIÇÃO</span><span class="avatar avatar-blue">?</span></div><div class="big-count gray">${unknownCount}<small>AGUARDANDO ANÁLISE</small></div><div class="small-count gray">Nenhuma classificação factual</div></aside>
        </div>
        ${selected ? `<div class="tm-detail"><div class="detail-head"><div><span class="tm-kicker">LEGENDA CAPTURADA</span><h2>${escapeHtml(selected.text)}</h2></div><span class="status unknown">NÃO VERIFICADA</span></div><div class="detail-meta"><span>◷ ${formatTime(selected.start)}</span><span>◉ Participante não identificado</span><span>Sem pontuação</span></div><blockquote>“${escapeHtml(selected.quote)}”</blockquote><p class="reason">${escapeHtml(selected.reason)}</p><div class="evidence-box"><strong>Origem</strong><p>${escapeHtml(selected.evidence)}</p><span class="muted">A etapa de checagem ainda não foi executada.</span></div><div class="review-row"><button data-action="next" class="secondary-btn">Próxima legenda →</button></div></div>` : ""}
        <div class="tm-timeline"><div class="timeline-title"><span>LEGENDAS CAPTURADAS</span><span class="muted">Clique para navegar</span></div><div class="claim-list">${claims.map((claim) => `<button data-action="select" data-id="${claim.id}" class="claim-row ${claim.id === state.selected ? "selected" : ""}"><span class="timeline-time">${formatTime(claim.start)}</span><span class="claim-speaker unknown">?</span><span class="claim-text">${escapeHtml(claim.text)}</span><span class="status-dot unknown"></span></button>`).join("")}</div></div>
        <footer class="tm-footer"><span><i class="footer-dot"></i> Legenda real · sem verificação factual ainda</span></footer>
        `}
      </section>` : ""}
    `;
    requestAnimationFrame(syncPlayerFrame);
  }

  function syncPlayerFrame() {
    const shell = root.querySelector(".tm-shell");
    const player = video();
    if (!shell || !player) return;
    const rect = player.getBoundingClientRect();
    shell.style.left = `${Math.max(0, rect.left)}px`;
    shell.style.top = `${Math.max(0, rect.top)}px`;
    shell.style.width = `${rect.width}px`;
    shell.style.height = `${rect.height}px`;
    shell.style.right = "auto";
  }

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "toggle-open") state.open = !state.open;
    if (action === "close") state.open = false;
    if (action === "minimize") state.minimized = true;
    if (action === "expand") state.minimized = false;
    if (action === "toggle-analysis") state.analysis = !state.analysis;
    if (action === "select") {
      state.selected = button.dataset.id;
      const selected = selectedClaim();
      if (selected && video()) video().currentTime = selected.start;
    }
    if (action === "next" && claims.length) {
      const index = claims.findIndex((claim) => claim.id === state.selected);
      state.selected = claims[(index + 1) % claims.length].id;
    }
    render();
  });

  document.addEventListener("play", render, true);
  document.addEventListener("pause", render, true);
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "truthmeter.toggle") {
      state.open = !state.open;
      render();
    }
  });

  setInterval(() => {
    captureCurrentCaption();
    syncPlayerFrame();
  }, 300);
  window.addEventListener("resize", syncPlayerFrame, true);
  document.addEventListener("fullscreenchange", () => setTimeout(syncPlayerFrame, 100), true);
  render();
})();
