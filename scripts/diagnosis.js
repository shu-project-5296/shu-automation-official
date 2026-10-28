(() => {
  const logic = window.SHU_DIAGNOSIS;
  const dialog = document.querySelector("[data-diagnosis-dialog]");
  const panel = document.querySelector("[data-diagnosis-panel]");
  const launcher = document.querySelector("[data-diagnosis-launcher]");
  const minimizeButton = document.querySelector("[data-diagnosis-minimize]");
  const restoreButton = document.querySelector("[data-diagnosis-restore]");
  if (!logic || !dialog || !panel || !launcher) return;

  const stateKey = "shu-diagnosis-state-v1";
  const attributionKey = "shu-automation-attribution-v1";
  const sent = new Set();
  let launcherWasMinimized = false;
  let state = { step: -1, answers: {}, complete: false };
  try {
    const saved = JSON.parse(sessionStorage.getItem(stateKey) || "null");
    if (saved && Number.isInteger(saved.step) && saved.answers) state = saved;
  } catch {}

  const sessionId = (() => {
    const key = "shu-diagnosis-session-id";
    let value = sessionStorage.getItem(key);
    if (!value) {
      value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(key, value);
    }
    return value;
  })();

  function attribution() {
    const params = new URLSearchParams(location.search);
    const sourceRaw = (params.get("utm_source") || "").toLowerCase();
    const source = sourceRaw === "ig" ? "instagram" : ["youtube", "instagram", "tiktok", "threads", "note"].includes(sourceRaw) ? sourceRaw : sourceRaw ? "other" : "direct";
    const current = { source, medium: (params.get("utm_medium") || "").slice(0, 80), campaign: (params.get("utm_campaign") || "").slice(0, 120), content: (params.get("utm_content") || "").slice(0, 120) };
    if (sourceRaw) sessionStorage.setItem(attributionKey, JSON.stringify(current));
    if (!sourceRaw) {
      try { return JSON.parse(sessionStorage.getItem(attributionKey) || "null") || current; } catch {}
    }
    return current;
  }

  function track(name, details = {}, onceKey = "") {
    if (onceKey && sent.has(onceKey)) return;
    if (onceKey) sent.add(onceKey);
    const result = state.complete ? logic.evaluate(state.answers).category : undefined;
    const payload = { ...attribution(), diagnosis_session_id: sessionId, event_time: new Date().toISOString(), result_category: result, ...details };
    if (typeof window.gtag === "function") window.gtag("event", name, payload);

    const legacyMap = { diagnosis_widget_view: "view", diagnosis_open: "start", diagnosis_complete: "complete", diagnosis_coconala_click: "coconala_click" };
    const legacyEvent = legacyMap[name];
    const endpoint = window.SHU_CONFIG?.analytics?.diagnosisEndpoint;
    if (!legacyEvent || !endpoint) return;
    const body = JSON.stringify({ event: legacyEvent, source: payload.source, medium: payload.medium, campaign: payload.campaign, content: payload.content, landing_variant: "official_site_widget" });
    try { navigator.sendBeacon(endpoint, new Blob([body], { type: "text/plain;charset=UTF-8" })); }
    catch { fetch(endpoint, { method: "POST", headers: { "content-type": "text/plain;charset=UTF-8" }, body, keepalive: true, mode: "no-cors" }).catch(() => {}); }
  }

  function save() { sessionStorage.setItem(stateKey, JSON.stringify(state)); }
  function escapeHtml(value) { const node = document.createElement("span"); node.textContent = value; return node.innerHTML; }

  function render() {
    if (state.complete) return renderResult();
    if (state.step < 0) {
      panel.innerHTML = `<div class="diagnosis-intro"><span class="diagnosis-kicker">5問・約1分</span><h2 id="diagnosis-title">5問で、改善の入口を整理します。</h2><p>選ぶだけ・約1分。名前やメールアドレスの入力はありません。</p><div class="diagnosis-trust"><span>✓ 無料</span><span>✓ 個人情報入力なし</span><span>✓ 結果だけでもOK</span></div><button class="diagnosis-primary" type="button" data-diagnosis-start>無料診断を始める</button></div>`;
      panel.querySelector("[data-diagnosis-start]").addEventListener("click", () => { state = { step: 0, answers: {}, complete: false }; save(); track("diagnosis_open", {}, "open"); render(); });
      return;
    }
    const question = logic.questions[state.step];
    const progress = ((state.step + 1) / logic.questions.length) * 100;
    panel.innerHTML = `<div class="diagnosis-progress-row"><span>QUESTION ${state.step + 1} / ${logic.questions.length}</span><span>${Math.round(progress)}%</span></div><div class="diagnosis-progress" role="progressbar" aria-valuemin="1" aria-valuemax="5" aria-valuenow="${state.step + 1}" aria-label="${state.step + 1}問目、全5問"><i style="width:${progress}%"></i></div><h2 id="diagnosis-title">${escapeHtml(question.text)}</h2><div class="diagnosis-options">${question.options.map((option) => `<button type="button" data-answer="${option.value}"${state.answers[question.id] === option.value ? ' aria-pressed="true"' : ""}><span>${escapeHtml(option.label)}</span><b aria-hidden="true">›</b></button>`).join("")}</div><div class="diagnosis-controls"><button type="button" data-diagnosis-back>← 戻る</button><button type="button" data-diagnosis-reset>最初から</button></div>`;
    panel.querySelectorAll("[data-answer]").forEach((button) => button.addEventListener("click", () => {
      state.answers[question.id] = button.dataset.answer;
      track("diagnosis_answer", { question_id: question.id, question_number: state.step + 1, answer: button.dataset.answer }, `answer:${question.id}:${button.dataset.answer}`);
      if (state.step === logic.questions.length - 1) { state.complete = true; track("diagnosis_complete", {}, "complete"); } else state.step += 1;
      save(); render();
    }));
    panel.querySelector("[data-diagnosis-back]").addEventListener("click", () => { state.step = Math.max(-1, state.step - 1); save(); render(); });
    panel.querySelector("[data-diagnosis-reset]").addEventListener("click", reset);
  }

  function renderResult() {
    const result = logic.evaluate(state.answers);
    panel.innerHTML = `<div class="diagnosis-result"><span class="diagnosis-kicker">✓ 診断結果</span><p class="diagnosis-result-label">おすすめ改善テーマ</p><h2 id="diagnosis-title">${escapeHtml(result.title)}</h2><p>${escapeHtml(result.summary)}</p><div class="diagnosis-methods"><h3>想定される改善方法</h3><ul>${result.methods.map((method) => `<li>${escapeHtml(method)}</li>`).join("")}</ul></div><p class="diagnosis-note">実現方法は、使用環境・作業ルール・例外の有無によって変わります。</p><button class="diagnosis-copy" type="button" data-diagnosis-copy>相談内容をコピー</button><a class="diagnosis-primary diagnosis-coconala" data-diagnosis-coconala href="${window.SHU_CONFIG?.links?.coconala || "#contact"}" target="_blank" rel="noopener noreferrer">ココナラで無料相談する <span aria-hidden="true">↗</span></a><button class="diagnosis-restart" type="button" data-diagnosis-reset>もう一度診断する</button><p class="diagnosis-copy-status" data-copy-status aria-live="polite"></p></div>`;
    panel.querySelector("[data-diagnosis-copy]").addEventListener("click", async () => {
      const status = panel.querySelector("[data-copy-status]");
      try { await navigator.clipboard.writeText(logic.buildConsultationMessage(state.answers)); status.textContent = "相談内容をコピーしました。"; track("diagnosis_result_copy", {}, "copy"); }
      catch { status.textContent = "コピーできませんでした。端末の設定をご確認ください。"; }
    });
    panel.querySelector("[data-diagnosis-coconala]").addEventListener("click", () => track("diagnosis_coconala_click", {}, "coconala"));
    panel.querySelector("[data-diagnosis-reset]").addEventListener("click", reset);
  }

  function reset() { state = { step: -1, answers: {}, complete: false }; sent.clear(); save(); render(); }
  function rectanglesOverlap(a, b, padding = 6) {
    return a.left < b.right + padding && a.right > b.left - padding && a.top < b.bottom + padding && a.bottom > b.top - padding;
  }
  function protectPageActions() {
    if (launcher.hidden || dialog.open) return;
    launcher.style.setProperty("--launcher-lift", "0px");
    const actions = [...document.querySelectorAll(".hero .button, .site-header a, .site-header button, .contact-card a, .site-footer a")]
      .filter((element) => !launcher.contains(element) && element.getClientRects().length);
    let lift = 0;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const launcherRect = launcher.getBoundingClientRect();
      const overlapping = actions.filter((element) => rectanglesOverlap(launcherRect, element.getBoundingClientRect()));
      if (!overlapping.length) break;
      const targetTop = Math.min(...overlapping.map((element) => element.getBoundingClientRect().top));
      const delta = Math.max(0, launcherRect.bottom - targetTop + 12);
      if (!delta) break;
      lift += delta;
      launcher.style.setProperty("--launcher-lift", `${Math.min(lift, Math.max(0, innerHeight - launcher.offsetHeight - 20))}px`);
    }
  }
  function setLauncherMinimized(minimized, moveFocus = true) {
    launcher.classList.toggle("is-minimized", minimized);
    if (moveFocus) (minimized ? restoreButton : minimizeButton)?.focus();
    requestAnimationFrame(protectPageActions);
  }
  function openDiagnosis() {
    launcherWasMinimized = launcher.classList.contains("is-minimized");
    launcher.hidden = true;
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
    document.body.classList.add("diagnosis-open");
    render();
    requestAnimationFrame(() => panel.querySelector("button, a")?.focus());
  }
  function closeDiagnosis() {
    if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open");
    launcher.hidden = false;
    document.body.classList.remove("diagnosis-open");
    (launcherWasMinimized ? restoreButton : launcher.querySelector("[data-open-diagnosis]"))?.focus();
    requestAnimationFrame(protectPageActions);
  }

  document.querySelectorAll("[data-open-diagnosis]").forEach((button) => button.addEventListener("click", (event) => { event.preventDefault(); openDiagnosis(); }));
  minimizeButton?.addEventListener("click", () => setLauncherMinimized(true));
  restoreButton?.addEventListener("click", () => setLauncherMinimized(false));
  document.querySelector("[data-diagnosis-close]")?.addEventListener("click", closeDiagnosis);
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDiagnosis(); });
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeDiagnosis(); });
  window.addEventListener("resize", protectPageActions, { passive: true });
  window.addEventListener("scroll", protectPageActions, { passive: true });
  requestAnimationFrame(protectPageActions);
  track("diagnosis_widget_view", {}, "widget-view");
})();
