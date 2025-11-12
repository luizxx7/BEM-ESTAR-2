/* Plataforma de Bem-Estar - script.js
   Versão 2.0: recursos de perfil, persistência, export, meditação, voz, notificações e UX melhorada.
*/

(() => {
  // --- Helpers ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const todayISO = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // LocalStorage keys
  const LS_PROFILES = "wb_profiles_v2";
  const LS_CURRENT = "wb_currentProfile_v2";

  // DOM elements
  const profileSelect = $("#profileSelect");
  const btnNewProfile = $("#btnNewProfile");
  const modalProfile = $("#modalProfile");
  const inputProfileName = $("#inputProfileName");
  const saveProfileBtn = $("#saveProfile");
  const cancelProfileBtn = $("#cancelProfile");

  const gratTextarea = $("#gratidaoTexto");
  const btnSalvarGratidao = $("#btnSalvarGratidao");
  const listaGratidao = $("#listaGratidao");
  const gratStreak = $("#gratidaoStreak");
  const exportGratBtn = $("#exportGratidao");
  const printGratBtn = $("#printGratidao");
  const btnVoiceGrat = $("#btnVoiceGratidao");

  const dicasList = $("#listaDicas");
  const fraseBox = $("#fraseBox");
  const btnFrase = $("#btnFraseAleatoria");

  const metaInput = $("#metaInput");
  const btnAddMeta = $("#btnAddMeta");
  const listaMetas = $("#listaMetas");
  const exportMetasBtn = $("#exportMetas");
  const clearMetasBtn = $("#clearMetas");

  const formHumor = $("#formHumor");
  const respostaHumor = $("#respostaHumor");
  const historicoHumor = $("#historicoHumor");
  const btnHistoricoHumor = $("#btnHistoricoHumor");

  const meditacaoSelect = $("#meditacaoSelect");
  const meditacaoAudio = $("#meditacaoAudio");
  const meditacaoSource = $("#meditacaoSource");

  const themeToggle = $("#toggleTheme");


  // --- Profile management (simple local "login") ---
  function loadProfiles() {
    const raw = localStorage.getItem(LS_PROFILES);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveProfiles(profiles) {
    localStorage.setItem(LS_PROFILES, JSON.stringify(profiles));
  }

  function getCurrentProfile() {
    return localStorage.getItem(LS_CURRENT) || null;
  }

  function setCurrentProfile(id) {
    localStorage.setItem(LS_CURRENT, id);
    renderProfiles();
    loadAllForProfile();
  }

  function createProfile(name) {
    const profiles = loadProfiles();
    const id = `p_${Date.now()}`;
    profiles.push({ id, name, created: new Date().toISOString() });
    saveProfiles(profiles);
    setCurrentProfile(id);
    return id;
  }

  function renderProfiles() {
    const profiles = loadProfiles();
    profileSelect.innerHTML = "";
    if (profiles.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "— nenhum perfil —";
      profileSelect.appendChild(opt);
      return;
    }
    profiles.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      profileSelect.appendChild(opt);
    });
    const current = getCurrentProfile();
    profileSelect.value = current || profiles[0].id;
    if (!current && profiles[0]) setCurrentProfile(profiles[0].id);
  }

  // --- Per-profile storage helpers ---
  function keyFor(profileId, keyBase) {
    return `${profileId}::${keyBase}`;
  }

  function saveGratitude(profileId, entries) {
    localStorage.setItem(keyFor(profileId, "gratidoes"), JSON.stringify(entries));
  }

  function loadGratitude(profileId) {
    try {
      return JSON.parse(localStorage.getItem(keyFor(profileId, "gratidoes")) || "[]");
    } catch {
      return [];
    }
  }

  function saveMetas(profileId, metas) {
    localStorage.setItem(keyFor(profileId, "metas"), JSON.stringify(metas));
  }
  function loadMetas(profileId) {
    try {
      return JSON.parse(localStorage.getItem(keyFor(profileId, "metas")) || "[]");
    } catch { return []; }
  }

  function saveHumorHistory(profileId, hist) {
    localStorage.setItem(keyFor(profileId, "humorHist"), JSON.stringify(hist));
  }
  function loadHumorHistory(profileId) {
    try {
      return JSON.parse(localStorage.getItem(keyFor(profileId, "humorHist")) || "[]");
    } catch { return []; }
  }

  // --- Gratidão: salvar, mostrar, streak ---
  function salvarGratidao() {
    const profileId = getCurrentProfile();
    if (!profileId) { alert("Crie ou selecione um perfil primeiro."); return; }

    const texto = gratTextarea.value.trim();
    if (!texto) return;

    const lista = loadGratitude(profileId);
    // guardar data em ISO YYYY-MM-DD
    lista.push({ texto, dataISO: todayISO(), createdAt: new Date().toISOString() });
    saveGratitude(profileId, lista);
    gratTextarea.value = "";
    mostrarGratidao();
    showToast("Gratidão salva ✨");
  }

  function mostrarGratidao() {
    const profileId = getCurrentProfile();
    listaGratidao.innerHTML = "";
    if (!profileId) { listaGratidao.textContent = "Nenhum perfil selecionado."; return; }
    const lista = loadGratitude(profileId);
    // mostrar últimas 8 (mais recentes primeiro)
    lista.slice(-8).reverse().forEach(item => {
      const div = document.createElement("div");
      const d = document.createElement("div");
      d.innerHTML = `<strong>${item.dataISO}</strong> — ${escapeHTML(item.texto)}`;
      div.appendChild(d);
      listaGratidao.appendChild(div);
    });
    calcularStreak();
  }

  function calcularStreak() {
    const profileId = getCurrentProfile();
    if (!profileId) { gratStreak.textContent = "🔥 Streak: 0"; return; }
    const lista = loadGratitude(profileId).map(x => x.dataISO);
    // produzir conjunto único de datas
    const setDates = Array.from(new Set(lista)).sort();
    let streak = 0;
    let day = new Date();
    // loop backward while date exists in set
    while (true) {
      const iso = day.toISOString().slice(0,10);
      if (setDates.includes(iso)) {
        streak++;
        day.setDate(day.getDate() - 1);
      } else break;
      // safety
      if (streak > 3650) break;
    }
    gratStreak.textContent = `🔥 Streak: ${streak}`;
  }

  // --- Export / Print Gratidao ---
  function exportGratidaoTXT() {
    const profileId = getCurrentProfile();
    if (!profileId) return alert("Selecione um perfil.");
    const lista = loadGratitude(profileId);
    if (lista.length === 0) return alert("Nenhuma entrada para exportar.");
    const lines = lista.map(it => `${it.dataISO} - ${it.texto}`);
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gratidao_${profileId}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function printGratidao() {
    // abrir uma nova janela com conteúdo amigável para impressão
    const profileId = getCurrentProfile();
    const lista = profileId ? loadGratitude(profileId) : [];
    let html = `<html><head><title>Diário de Gratidão</title><style>body{font-family:Arial;padding:20px}</style></head><body>`;
    html += `<h1>Diário de Gratidão</h1>`;
    lista.forEach(item => {
      html += `<p><strong>${item.dataISO}</strong><br>${escapeHTML(item.texto)}</p><hr>`;
    });
    html += `</body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  }

  // --- Metas ---
  function adicionarMeta() {
    const profileId = getCurrentProfile();
    if (!profileId) { alert("Crie ou selecione um perfil primeiro."); return; }
    const texto = metaInput.value.trim();
    if (!texto) return;
    const metas = loadMetas(profileId);
    metas.push({ texto, createdAt: new Date().toISOString() });
    saveMetas(profileId, metas);
    metaInput.value = "";
    renderMetas();
    showToast("Meta adicionada ✅");
  }

  function renderMetas() {
    const profileId = getCurrentProfile();
    listaMetas.innerHTML = "";
    if (!profileId) { listaMetas.textContent = "Nenhum perfil selecionado."; return; }
    const metas = loadMetas(profileId);
    metas.forEach((m, idx) => {
      const li = document.createElement("li");
      li.textContent = `${m.texto} `;
      const btn = document.createElement("button");
      btn.className = "btn small ghost";
      btn.textContent = "Remover";
      btn.addEventListener("click", () => {
        metas.splice(idx, 1);
        saveMetas(profileId, metas);
        renderMetas();
      });
      li.appendChild(btn);
      listaMetas.appendChild(li);
    });
  }

  function exportMetasTXT() {
    const profileId = getCurrentProfile();
    if (!profileId) return alert("Selecione um perfil.");
    const metas = loadMetas(profileId);
    if (metas.length === 0) return alert("Nenhuma meta para exportar.");
    const blob = new Blob([metas.map(m => m.texto).join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `metas_${profileId}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // --- Dicas e Frases ---
  const dicas = [
    "Faça uma caminhada ao ar livre por 10 minutos.",
    "Tire 5 minutos para respirar profundamente.",
    "Beba água regularmente durante o dia.",
    "Desconecte-se das redes sociais por 1 hora.",
    "Escreva algo positivo sobre você hoje.",
    "Pratique uma pequena gentileza hoje."
  ];
  const frases = [
    "A cada pequeno passo, você se aproxima de uma vida mais leve.",
    "Respire. Você fez o melhor que pôde até aqui.",
    "Pequenas práticas levam a grandes mudanças.",
    "A gratidão transforma o que temos em suficiente."
  ];

  function carregarDicas() {
    dicasList.innerHTML = "";
    dicas.forEach(d => {
      const li = document.createElement("li");
      li.textContent = d;
      dicasList.appendChild(li);
    });
  }
  function mostrarFraseAleatoria() {
    fraseBox.textContent = frases[Math.floor(Math.random() * frases.length)];
  }

  // --- Humor ---
  function initHumor() {
    formHumor.addEventListener("submit", function(e) {
      e.preventDefault();
      const selected = document.querySelector('input[name="humor"]:checked');
      const profileId = getCurrentProfile();
      if (!selected) {
        respostaHumor.textContent = "Por favor, selecione uma opção.";
        return;
      }
      respostaHumor.textContent = `Você está se sentindo "${selected.value}". Obrigado por compartilhar!`;
      // salvar histórico
      if (profileId) {
        const hist = loadHumorHistory(profileId);
        hist.push({ value: selected.value, dateISO: todayISO(), createdAt: new Date().toISOString() });
        saveHumorHistory(profileId, hist);
      }
      // limpar seleção
      $$('input[name="humor"]').forEach(i => i.checked = false);
      showToast("Humor registrado");
    });

    btnHistoricoHumor.addEventListener("click", () => {
      renderHistoricoHumor();
    });
  }

  function renderHistoricoHumor() {
    const profileId = getCurrentProfile();
    historicoHumor.innerHTML = "";
    if (!profileId) { historicoHumor.textContent = "Selecione um perfil para ver histórico."; return; }
    const hist = loadHumorHistory(profileId).slice(-12).reverse();
    if (hist.length === 0) return historicoHumor.textContent = "Sem histórico ainda.";
    hist.forEach(h => {
      const div = document.createElement("div");
      div.textContent = `${h.dateISO} — ${h.value}`;
      historicoHumor.appendChild(div);
    });
  }

  // --- Meditation player ---
  function initMeditation() {
    meditacaoSelect.addEventListener("change", () => {
      const val = meditacaoSelect.value;
      if (!val) { meditacaoSource.src = ""; meditacaoAudio.load(); return; }
      // NOTE: the audio files must exist relative to site, or use absolute urls
      meditacaoSource.src = val;
      meditacaoAudio.load();
      meditacaoAudio.play().catch(()=>{ /* autoplay blocked */ });
    });
  }

  // --- Voice input for gratitude (SpeechRecognition) ---
  let recognition = null;
  function initSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btnVoiceGrat.style.display = "none";
      return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    btnVoiceGrat.addEventListener("click", () => {
      if (btnVoiceGrat.getAttribute("aria-pressed") === "true") {
        recognition.stop();
        return;
      }
      btnVoiceGrat.setAttribute("aria-pressed", "true");
      recognition.start();
    });

    recognition.addEventListener("result", (ev) => {
      const text = ev.results[0][0].transcript;
      gratTextarea.value = (gratTextarea.value ? gratTextarea.value + " " : "") + text;
    });
    recognition.addEventListener("end", () => {
      btnVoiceGrat.setAttribute("aria-pressed", "false");
    });
    recognition.addEventListener("error", (e) => {
      console.error("Speech error", e);
      btnVoiceGrat.setAttribute("aria-pressed", "false");
    });
  }

  // --- Notifications (request permission) ---
  function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then(p => {
        if (p === "granted") showToast("Notificações habilitadas");
      });
    }
  }

  function scheduleReminder() {
    // NOTE: scheduling across browser restarts requires Service Worker or server; here we do a simple demo that fires after 10s
    if (Notification.permission !== "granted") return;
    setTimeout(() => {
      new Notification("Hora de registrar sua gratidão", { body: "Tire 1 minuto para anotar 3 coisas boas do dia." });
    }, 10000);
  }

  // --- UI helpers ---
  function showModalProfile(open = true) {
    modalProfile.setAttribute("aria-hidden", open ? "false" : "true");
    modalProfile.style.display = open ? "flex" : "none";
    if (open) inputProfileName.focus();
  }

  function escapeHTML(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  // tiny toast (visual)
  function showToast(msg, ms = 1500) {
    let t = document.getElementById("wb_toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "wb_toast";
      t.style.position = "fixed";
      t.style.right = "16px";
      t.style.bottom = "16px";
      t.style.background = "var(--primary)";
      t.style.color = "#fff";
      t.style.padding = "10px 14px";
      t.style.borderRadius = "10px";
      t.style.boxShadow = "var(--shadow)";
      t.style.zIndex = 9999;
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = "block";
    setTimeout(() => { t.style.display = "none"; }, ms);
  }

  // --- Theme handling ---
  function initTheme() {
    const darkPref = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const stored = localStorage.getItem("wb_theme_v2");
    const root = document.documentElement;
    const apply = (dark) => {
      if (dark) root.classList.add('dark');
      else root.classList.remove('dark');
      themeToggle.checked = !!dark;
      localStorage.setItem("wb_theme_v2", dark ? "dark" : "light");
    };
    if (stored) apply(stored === "dark");
    else apply(darkPref);
    themeToggle.addEventListener("change", (e) => apply(e.target.checked));
  }

  // --- Load everything for a profile ---
  function loadAllForProfile() {
    mostrarGratidao();
    renderMetas();
    renderHistoricoHumor();
    carregarDicas();
    mostrarFraseAleatoria();
  }

  // --- Events and init ---
  document.addEventListener("DOMContentLoaded", () => {
    renderProfiles();
    initTheme();
    initMeditation();
    initHumor();
    initSpeech();
    requestNotificationPermission();

    // Default ejemplo: pre-fill a demo profile if none
    if (!getCurrentProfile()) {
      if (confirm("Criar perfil de teste 'Você' agora?")) {
        createProfile("Você");
      }
    }

    // Event bindings
    btnNewProfile.addEventListener("click", () => showModalProfile(true));
    cancelProfileBtn.addEventListener("click", () => showModalProfile(false));
    saveProfileBtn.addEventListener("click", () => {
      const name = inputProfileName.value.trim();
      if (!name) return alert("Digite um nome para o perfil.");
      createProfile(name);
      inputProfileName.value = "";
      showModalProfile(false);
      showToast("Perfil criado");
    });

    profileSelect.addEventListener("change", (e) => {
      setCurrentProfile(e.target.value);
    });

    btnSalvarGratidao.addEventListener("click", salvarGratidao);
    exportGratBtn.addEventListener("click", exportGratidaoTXT);
    printGratBtn.addEventListener("click", printGratidao);

    btnAddMeta.addEventListener("click", adicionarMeta);
    exportMetasBtn.addEventListener("click", exportMetasTXT);
    clearMetasBtn.addEventListener("click", () => {
      const profileId = getCurrentProfile();
      if (!profileId) return;
      if (!confirm("Deseja realmente limpar todas as metas?")) return;
      saveMetas(profileId, []);
      renderMetas();
      showToast("Metas limpas");
    });

    btnFrase.addEventListener("click", mostrarFraseAleatoria);

    // schedule a demo reminder (10s) to show notifications
    scheduleReminder();
  });

  // expose a few functions for console/debug
  window.wb_debug = {
    createProfile, loadProfiles, setCurrentProfile
  };

})();
