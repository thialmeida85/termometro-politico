(() => {
  if (window.__truthMeterLoaded) return;
  window.__truthMeterLoaded = true;

  const claims = [
    {
      id: "claim-1",
      speaker: "Lula",
      speakerKey: "p1",
      start: 8,
      end: 24,
      text: "A inflação acumulada no período ficou abaixo de 5%.",
      quote: "A inflação acumulada no período ficou abaixo de 5%.",
      status: "CORROBORADA",
      score: 91,
      evidence: "Fonte primária simulada: série estatística oficial, consulta em 23/10/2026.",
      source: "https://www.ibge.gov.br/",
      reason: "A fonte apresentada sustenta o valor e o período informado.",
      confidence: "Alta"
    },
    {
      id: "claim-2",
      speaker: "Flávio",
      speakerKey: "p2",
      start: 31,
      end: 49,
      text: "O desemprego dobrou desde o início do ano.",
      quote: "O desemprego dobrou desde o início do ano.",
      status: "PARCIAL",
      score: 58,
      evidence: "A série simulada indica aumento, mas não uma duplicação no intervalo citado.",
      source: "https://www.ibge.gov.br/explica/desemprego.php",
      reason: "A direção geral está correta, porém a intensidade foi exagerada.",
      confidence: "Média"
    },
    {
      id: "claim-3",
      speaker: "Lula",
      speakerKey: "p1",
      start: 55,
      end: 73,
      text: "Este é o maior resultado da história.",
      quote: "Este é o maior resultado da história.",
      status: "INDETERMINADA",
      score: null,
      evidence: "Não há período, métrica ou série histórica suficiente para verificar.",
      source: "",
      reason: "A afirmação precisa de escopo e de uma fonte comparável.",
      confidence: "Baixa"
    },
    {
      id: "claim-4",
      speaker: "Flávio",
      speakerKey: "p2",
      start: 79,
      end: 98,
      text: "O programa alcançou 10 milhões de pessoas.",
      quote: "O programa alcançou 10 milhões de pessoas.",
      status: "CONTRADITA",
      score: 9,
      evidence: "A fonte simulada informa 6,8 milhões de pessoas alcançadas.",
      source: "https://www.gov.br/",
      reason: "O número divulgado não coincide com o dado publicado na fonte.",
      confidence: "Alta"
    }
  ];

  const state = {
    open: true,
    minimized: false,
    analysis: true,
    selected: claims[0].id,
    reviewed: {},
    mode: "RECENTE"
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
  const selectedClaim = () => claims.find((claim) => claim.id === state.selected) || claims[0];

  function computeScore() {
    const verified = claims.filter((claim) => claim.score !== null);
    if (!verified.length) return null;
    return Math.round(verified.reduce((sum, claim) => sum + claim.score, 0) / verified.length);
  }

  function render() {
    const score = computeScore();
    const selected = selectedClaim();
    const p1 = claims.filter((claim) => claim.speakerKey === "p1");
    const p2 = claims.filter((claim) => claim.speakerKey === "p2");
    const count = (items, statuses) => items.filter((item) => statuses.includes(item.status)).length;
    const currentTime = video()?.currentTime || 0;
    const active = claims.find((claim) => currentTime >= claim.start && currentTime <= claim.end);

    root.innerHTML = `
      <div class="tm-launcher" data-action="toggle-open" title="Abrir TruthMeter">TM</div>
      ${state.open ? `
      <section class="tm-shell ${state.minimized ? "is-minimized" : ""}">
        <header class="tm-header">
          <div class="tm-brand"><span class="tm-dot"></span><div><strong>TRUTHMETER</strong><small>índice de evidência</small></div></div>
          <div class="tm-header-actions"><span class="tm-live"><i></i>${state.analysis ? "Análise ativa" : "Pausada"}</span><button data-action="toggle-analysis" class="tm-icon">${state.analysis ? "Ⅱ" : "▶"}</button><button data-action="minimize" class="tm-icon">—</button><button data-action="close" class="tm-icon">×</button></div>
        </header>
        ${state.minimized ? `<div class="tm-minimized-bar"><span>${score === null ? "Sem dados" : `${score}/100`}</span><button data-action="expand">Expandir painel</button></div>` : `
        <div class="tm-body">
          <aside class="tm-speaker speaker-left"><div class="speaker-label"><span class="avatar avatar-red">L</span><span>LULA</span></div><div class="big-count red">${count(p1, ["CONTRADITA"])}<small>CONTRADITAS</small></div><div class="small-count blue">${count(p1, ["CORROBORADA"])} corroboradas</div><div class="small-count gray">${count(p1, ["INDETERMINADA"])} indeterminadas</div></aside>
          <main class="tm-center"><div class="tm-kicker">${state.mode} · ${claims.filter((c) => c.score !== null).length} verificadas</div><div class="gauge"><div class="gauge-arc"></div><div class="gauge-ticks"><span>0</span><span>50</span><span>100</span></div><div class="gauge-value">${score === null ? "—" : score}<small>${score === null ? "SEM DADOS" : "ÍNDICE"}</small></div><div class="gauge-needle" style="transform: rotate(${score === null ? -90 : -90 + score * 1.8}deg)"></div></div><div class="tm-now">${active ? `<span class="pulse"></span> Analisando: ${escapeHtml(active.speaker)}` : "Aguardando afirmação verificável"}</div></main>
          <aside class="tm-speaker speaker-right"><div class="speaker-label"><span>FLÁVIO</span><span class="avatar avatar-blue">F</span></div><div class="big-count blue">${count(p2, ["CORROBORADA"])}<small>CORROBORADAS</small></div><div class="small-count red">${count(p2, ["CONTRADITA"])} contraditas</div><div class="small-count amber">${count(p2, ["PARCIAL"])} parciais</div></aside>
        </div>
        <div class="tm-detail"><div class="detail-head"><div><span class="tm-kicker">AFIRMAÇÃO SELECIONADA</span><h2>${escapeHtml(selected.text)}</h2></div><span class="status ${statusClass(selected.status)}">${escapeHtml(selected.status)}</span></div><div class="detail-meta"><span>◷ ${formatTime(selected.start)}–${formatTime(selected.end)}</span><span>◉ ${escapeHtml(selected.speaker)}</span><span>Confiança: ${escapeHtml(selected.confidence)}</span></div><blockquote>“${escapeHtml(selected.quote)}”</blockquote><p class="reason">${escapeHtml(selected.reason)}</p><div class="evidence-box"><strong> Evidência</strong><p>${escapeHtml(selected.evidence)}</p>${selected.source ? `<a href="${escapeHtml(selected.source)}" target="_blank" rel="noreferrer">Abrir fonte ↗</a>` : `<span class="muted">Nenhuma fonte suficiente adicionada</span>`}</div><div class="review-row"><button data-action="review" data-id="${selected.id}" class="review-btn">${state.reviewed[selected.id] ? "✓ Revisada" : "Marcar como revisada"}</button><button data-action="next" class="secondary-btn">Próxima afirmação →</button></div></div>
        <div class="tm-timeline"><div class="timeline-title"><span>HISTÓRICO DO VÍDEO</span><span class="muted">Clique em um evento para navegar</span></div><div class="claim-list">${claims.map((claim) => `<button data-action="select" data-id="${claim.id}" class="claim-row ${claim.id === selected.id ? "selected" : ""} ${active?.id === claim.id ? "playing" : ""}"><span class="timeline-time">${formatTime(claim.start)}</span><span class="claim-speaker ${claim.speakerKey}">${claim.speaker.replace("Pessoa ", "P")}</span><span class="claim-text">${escapeHtml(claim.text)}</span><span class="status-dot ${statusClass(claim.status)}"></span></button>`).join("")}</div></div>
        <footer class="tm-footer"><span><i class="footer-dot"></i> Protótipo local · nenhuma captura de áudio</span><button data-action="reset">Reiniciar demonstração</button></footer>
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
    shell.style.maxHeight = "none";
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
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
      if (video()) video().currentTime = selected.start;
    }
    if (action === "review") state.reviewed[button.dataset.id] = true;
    if (action === "next") {
      const index = claims.findIndex((claim) => claim.id === state.selected);
      state.selected = claims[(index + 1) % claims.length].id;
    }
    if (action === "reset") { state.selected = claims[0].id; state.reviewed = {}; state.analysis = true; state.minimized = false; }
    render();
  });

  function syncWithVideo() {
    const current = video()?.currentTime;
    if (typeof current !== "number" || !state.analysis) return;
    const active = claims.find((claim) => current >= claim.start && current <= claim.end);
    if (active && active.id !== state.selected) { state.selected = active.id; render(); }
  }

  document.addEventListener("play", () => render(), true);
  document.addEventListener("pause", () => render(), true);
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "truthmeter.toggle") {
      state.open = !state.open;
      render();
    }
  });
  setInterval(syncWithVideo, 500);
  window.addEventListener("resize", syncPlayerFrame, true);
  document.addEventListener("fullscreenchange", () => setTimeout(syncPlayerFrame, 100), true);
  const observer = new MutationObserver(() => { if (!document.querySelector("video")) return; });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  render();
})();
