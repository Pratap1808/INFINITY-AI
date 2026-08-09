/**
 * INFINITY AI — Main application logic.
 * Talks to the backend at /api/*. When served by the same Express server
 * (recommended, see server.js) INFINITY_API_BASE can stay empty.
 */
window.INFINITY_API_BASE = window.INFINITY_API_BASE || '';

(function () {
  const API = window.INFINITY_API_BASE;

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  const state = {
    mode: 'assistant',
    history: [], // [{role:'user'|'model', text}]
    sending: false,
    settings: {
      voiceName: null,
      language: 'en-US',
      ttsEnabled: true,
      theme: 'nebula-violet',
      memoryEnabled: true,
    },
    pendingImage: null, // { base64, mimeType, previewUrl }
    conversations: JSON.parse(localStorage.getItem('infinity_conversations') || '[]'),
    deviceId: localStorage.getItem('infinity_device_id') || createDeviceId(),
  };

  function createDeviceId() {
    const id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('infinity_device_id', id);
    return id;
  }

  loadSettings();

  function withDeviceHeaders(extra = {}) {
    return { 'X-Device-Id': state.deviceId, ...extra };
  }

  // ---------------------------------------------------------------------
  // Element refs
  // ---------------------------------------------------------------------
  const el = {
    drawer: document.getElementById('drawer'),
    drawerOverlay: document.getElementById('drawer-overlay'),
    menuBtn: document.getElementById('menu-btn'),
    drawerClose: document.getElementById('drawer-close'),
    modeList: document.getElementById('mode-list'),
    chatScroll: document.getElementById('chat-scroll'),
    messages: document.getElementById('messages'),
    welcomeCard: document.querySelector('.welcome-card'),
    typingIndicator: document.getElementById('typing-indicator'),
    textInput: document.getElementById('text-input'),
    sendBtn: document.getElementById('send-btn'),
    micBtn: document.getElementById('mic-btn'),
    attachBtn: document.getElementById('attach-btn'),
    fileInput: document.getElementById('file-input'),
    inputBar: document.getElementById('input-bar'),
    newChatBtn: document.getElementById('new-chat-btn'),
    historyList: document.getElementById('history-list'),

    profileBtn: document.getElementById('profile-btn'),
    profileModal: document.getElementById('profile-modal'),
    deviceIdDisplay: document.getElementById('device-id-display'),
    ownerStatusDisplay: document.getElementById('owner-status-display'),
    profileName: document.getElementById('profile-name'),

    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    voiceSelect: document.getElementById('voice-select'),
    languageSelect: document.getElementById('language-select'),
    ttsToggle: document.getElementById('tts-toggle'),
    themeSelect: document.getElementById('theme-select'),
    memoryToggle: document.getElementById('memory-toggle'),
    clearMemoryBtn: document.getElementById('clear-memory-btn'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),

    ownerBtn: document.getElementById('owner-btn'),
    ownerModal: document.getElementById('owner-modal'),
    ownerStepPassword: document.getElementById('owner-step-password'),
    ownerStepBiometric: document.getElementById('owner-step-biometric'),
    ownerStepPanel: document.getElementById('owner-step-panel'),
    ownerPassword: document.getElementById('owner-password'),
    ownerPasswordSubmit: document.getElementById('owner-password-submit'),
    ownerPasswordError: document.getElementById('owner-password-error'),
    ownerBiometricBtn: document.getElementById('owner-biometric-btn'),
    ownerBiometricRegisterBtn: document.getElementById('owner-biometric-register-btn'),
    ownerBiometricError: document.getElementById('owner-biometric-error'),
    ownerAppName: document.getElementById('owner-app-name'),
    ownerDefaultMode: document.getElementById('owner-default-mode'),
    ownerTheme: document.getElementById('owner-theme'),
    ownerSystemPrompt: document.getElementById('owner-system-prompt'),
    ownerMemoryToggle: document.getElementById('owner-memory-toggle'),
    ownerSaveBtn: document.getElementById('owner-save-btn'),
    ownerSaveStatus: document.getElementById('owner-save-status'),
    ownerLogoutBtn: document.getElementById('owner-logout-btn'),

    toolModal: document.getElementById('tool-modal'),
    toolTitle: document.getElementById('tool-title'),
    toolBody: document.getElementById('tool-body'),
  };

  // ---------------------------------------------------------------------
  // Init once splash finishes (also runs immediately if already visible)
  // ---------------------------------------------------------------------
  window.addEventListener('infinity:app-ready', init);
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('app').hidden) init();
  });

  let initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    applyRemoteConfig();
    renderHistoryList();
    bindEvents();
    autoResizeTextarea();
    populateVoices();
    updateOwnerStatusDisplay();
  }

  // ---------------------------------------------------------------------
  // Remote config (owner-set defaults)
  // ---------------------------------------------------------------------
  async function applyRemoteConfig() {
    try {
      const res = await fetch(`${API}/api/config`);
      if (!res.ok) return;
      const config = await res.json();
      document.body.setAttribute('data-theme', config.theme || 'nebula-violet');
      state.mode = config.defaultMode || state.mode;
      setActiveModeChip(state.mode);
      const brandNameEl = document.querySelector('.brand-name');
      if (brandNameEl && config.appName) {
        brandNameEl.innerHTML = config.appName.replace(/AI$/i, '<em>AI</em>');
      }
    } catch (e) {
      /* offline or first run — silently keep local defaults */
    }
  }

  // ---------------------------------------------------------------------
  // Settings persistence
  // ---------------------------------------------------------------------
  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('infinity_settings') || '{}');
      Object.assign(state.settings, saved);
    } catch {}
  }
  function saveSettings() {
    localStorage.setItem('infinity_settings', JSON.stringify(state.settings));
  }

  function populateVoices() {
    const voices = window.InfinityVoice.getVoices();
    const fill = () => {
      const list = window.InfinityVoice.getVoices();
      el.voiceSelect.innerHTML =
        '<option value="">Default</option>' +
        list.map((v) => `<option value="${v.name}">${v.name} (${v.lang})</option>`).join('');
      if (state.settings.voiceName) el.voiceSelect.value = state.settings.voiceName;
    };
    fill();
    setTimeout(fill, 400); // voices often load async
    el.languageSelect.value = state.settings.language;
    el.ttsToggle.checked = state.settings.ttsEnabled;
    el.themeSelect.value = state.settings.theme;
    el.memoryToggle.checked = state.settings.memoryEnabled;
  }

  // ---------------------------------------------------------------------
  // Drawer
  // ---------------------------------------------------------------------
  function openDrawer() {
    el.drawer.classList.add('open');
    el.drawerOverlay.classList.add('show');
  }
  function closeDrawer() {
    el.drawer.classList.remove('open');
    el.drawerOverlay.classList.remove('show');
  }

  // ---------------------------------------------------------------------
  // Modal helpers
  // ---------------------------------------------------------------------
  function openModal(modal) {
    modal.hidden = false;
  }
  function closeModal(modal) {
    modal.hidden = true;
  }

  // ---------------------------------------------------------------------
  // Chat rendering
  // ---------------------------------------------------------------------
  function appendMessage(role, text, opts = {}) {
    el.welcomeCard.style.display = 'none';
    const bubble = document.createElement('div');
    bubble.className = `msg ${role === 'user' ? 'user' : 'ai'}${opts.refused ? ' refused' : ''}`;
    bubble.textContent = text;

    if (opts.imageUrl) {
      const img = document.createElement('img');
      img.src = opts.imageUrl;
      img.className = 'msg-image';
      bubble.appendChild(img);
    }

    if (role !== 'user') {
      const meta = document.createElement('div');
      meta.className = 'msg-meta';
      const speakBtn = document.createElement('button');
      speakBtn.className = 'msg-speak-btn';
      speakBtn.textContent = '🔊 Listen';
      speakBtn.onclick = () =>
        window.InfinityVoice.speak(text, {
          voiceName: state.settings.voiceName,
          lang: state.settings.language,
        });
      meta.appendChild(speakBtn);
      bubble.appendChild(meta);
    }

    el.messages.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      el.chatScroll.scrollTop = el.chatScroll.scrollHeight;
    });
  }

  function showTyping(show) {
    el.typingIndicator.hidden = !show;
    if (show) scrollToBottom();
  }

  // ---------------------------------------------------------------------
  // Sending messages
  // ---------------------------------------------------------------------
  async function sendMessage() {
    const text = el.textInput.value.trim();
    if (!text && !state.pendingImage) return;
    if (state.sending) return;

    appendMessage('user', text || '(image)', {
      imageUrl: state.pendingImage ? state.pendingImage.previewUrl : null,
    });
    state.history.push({ role: 'user', text: text || '[image attached]' });

    const imagePayload = state.pendingImage;
    el.textInput.value = '';
    autoResizeTextarea();
    clearPendingImage();

    state.sending = true;
    showTyping(true);

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: withDeviceHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          message: text,
          mode: state.mode,
          history: state.history,
          imageBase64: imagePayload ? imagePayload.base64 : undefined,
          imageMimeType: imagePayload ? imagePayload.mimeType : undefined,
          rememberThis: false,
        }),
      });
      const data = await res.json();
      showTyping(false);

      if (!res.ok) {
        appendMessage('ai', data.error || 'Something went wrong. Please try again.', { refused: true });
        return;
      }

      appendMessage('ai', data.reply, { refused: !!data.refused });
      state.history.push({ role: 'model', text: data.reply });
      persistCurrentConversation();

      if (state.settings.ttsEnabled && !data.refused) {
        window.InfinityVoice.speak(data.reply, {
          voiceName: state.settings.voiceName,
          lang: state.settings.language,
        });
      }
    } catch (err) {
      showTyping(false);
      appendMessage('ai', 'I could not reach the server. Check your connection and try again.', {
        refused: true,
      });
    } finally {
      state.sending = false;
    }
  }

  // ---------------------------------------------------------------------
  // Conversation history (localStorage)
  // ---------------------------------------------------------------------
  let currentConvoId = null;

  function persistCurrentConversation() {
    if (!state.history.length) return;
    if (!currentConvoId) currentConvoId = 'c_' + Date.now();
    const title = (state.history[0]?.text || 'New chat').slice(0, 40);
    const existingIdx = state.conversations.findIndex((c) => c.id === currentConvoId);
    const record = { id: currentConvoId, title, mode: state.mode, history: state.history, updatedAt: Date.now() };
    if (existingIdx >= 0) state.conversations[existingIdx] = record;
    else state.conversations.unshift(record);
    state.conversations = state.conversations.slice(0, 30);
    localStorage.setItem('infinity_conversations', JSON.stringify(state.conversations));
    renderHistoryList();
  }

  function renderHistoryList() {
    if (!state.conversations.length) {
      el.historyList.innerHTML = '<div class="history-empty">No saved chats yet.</div>';
      return;
    }
    el.historyList.innerHTML = '';
    state.conversations.forEach((c) => {
      const item = document.createElement('div');
      item.className = 'history-entry';
      item.textContent = c.title || 'Untitled chat';
      item.onclick = () => loadConversation(c.id);
      el.historyList.appendChild(item);
    });
  }

  function loadConversation(id) {
    const convo = state.conversations.find((c) => c.id === id);
    if (!convo) return;
    currentConvoId = id;
    state.history = convo.history;
    state.mode = convo.mode || 'assistant';
    setActiveModeChip(state.mode);
    el.messages.innerHTML = '';
    el.welcomeCard.style.display = 'none';
    convo.history.forEach((turn) => appendMessage(turn.role === 'user' ? 'user' : 'ai', turn.text));
    closeDrawer();
  }

  function startNewChat() {
    currentConvoId = null;
    state.history = [];
    el.messages.innerHTML = '';
    el.welcomeCard.style.display = '';
    closeDrawer();
  }

  // ---------------------------------------------------------------------
  // Modes
  // ---------------------------------------------------------------------
  function setActiveModeChip(mode) {
    [...el.modeList.children].forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.mode === mode);
    });
  }

  el.modeList?.addEventListener('click', (e) => {
    const chip = e.target.closest('.mode-chip');
    if (!chip) return;
    state.mode = chip.dataset.mode;
    setActiveModeChip(state.mode);
    closeDrawer();
  });

  // ---------------------------------------------------------------------
  // Textarea auto-resize + keyboard-safe input bar
  // ---------------------------------------------------------------------
  function autoResizeTextarea() {
    el.textInput.style.height = 'auto';
    el.textInput.style.height = Math.min(el.textInput.scrollHeight, 120) + 'px';
  }

  function setupKeyboardAwareInput() {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    function onResize() {
      const keyboardInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      el.inputBar.style.transform = keyboardInset > 60 ? `translateY(-${keyboardInset}px)` : 'translateY(0)';
      if (keyboardInset > 60) scrollToBottom();
    }
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
  }

  // ---------------------------------------------------------------------
  // File attach + OCR
  // ---------------------------------------------------------------------
  function clearPendingImage() {
    state.pendingImage = null;
  }

  async function handleFileSelected(file) {
    if (!file) return;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(',')[1];
        state.pendingImage = { base64, mimeType: file.type, previewUrl: dataUrl };
        appendMessage('ai', `📎 Image attached: ${file.name}. Add a message and hit send, or ask me to describe/OCR it.`);
      };
      reader.readAsDataURL(file);
    } else {
      const form = new FormData();
      form.append('file', file);
      appendMessage('ai', `📎 Uploading ${file.name}…`);
      try {
        const res = await fetch(`${API}/api/upload`, { method: 'POST', body: form });
        const data = await res.json();
        if (data.extractedText) {
          el.textInput.value = `Here is the content of "${file.name}":\n\n${data.extractedText}\n\n`;
          autoResizeTextarea();
        }
        appendMessage('ai', data.message || 'File processed.');
      } catch {
        appendMessage('ai', 'File upload failed.', { refused: true });
      }
    }
  }

  // ---------------------------------------------------------------------
  // OCR tool (Tesseract.js, fully client-side)
  // ---------------------------------------------------------------------
  function runOcrFlow() {
    el.toolTitle.textContent = '🔤 OCR Scan';
    el.toolBody.innerHTML = `
      <p class="muted">Choose an image to extract text from.</p>
      <input type="file" id="ocr-file" accept="image/*" class="text-field" />
      <div id="ocr-progress" class="muted" style="margin-top:8px;"></div>
      <div id="ocr-result" class="tool-result" style="display:none;"></div>
    `;
    openModal(el.toolModal);
    document.getElementById('ocr-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const progressEl = document.getElementById('ocr-progress');
      const resultEl = document.getElementById('ocr-result');
      resultEl.style.display = 'none';
      progressEl.textContent = 'Scanning image…';
      try {
        const { data } = await Tesseract.recognize(file, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              progressEl.textContent = `Scanning… ${Math.round(m.progress * 100)}%`;
            }
          },
        });
        progressEl.textContent = 'Done.';
        resultEl.style.display = 'block';
        resultEl.textContent = data.text.trim() || '(No text detected)';
      } catch (err) {
        progressEl.textContent = 'OCR failed. Try a clearer image.';
      }
    });
  }

  // ---------------------------------------------------------------------
  // Tool panels: weather / news / search / video / image-gen
  // ---------------------------------------------------------------------
  function runWeatherFlow() {
    el.toolTitle.textContent = '☁️ Weather';
    el.toolBody.innerHTML = `
      <input type="text" id="weather-city" class="text-field" placeholder="City name (e.g. Mumbai)" />
      <button id="weather-go" class="primary-btn">Get weather</button>
      <div id="weather-result"></div>
    `;
    openModal(el.toolModal);
    document.getElementById('weather-go').onclick = async () => {
      const city = document.getElementById('weather-city').value.trim();
      const resultEl = document.getElementById('weather-result');
      if (!city) return;
      resultEl.innerHTML = '<div class="tool-result">Loading…</div>';
      try {
        const res = await fetch(`${API}/api/weather?city=${encodeURIComponent(city)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        resultEl.innerHTML = `<div class="tool-result">
          <strong>${data.location}, ${data.country || ''}</strong><br/>
          ${data.tempC}°C, feels like ${data.feelsLikeC}°C — ${data.condition}<br/>
          Humidity ${data.humidity}% · Wind ${data.windKph} km/h
        </div>`;
      } catch (err) {
        resultEl.innerHTML = `<div class="tool-result">${err.message || 'Could not fetch weather.'}</div>`;
      }
    };
  }

  function runNewsFlow() {
    el.toolTitle.textContent = '📰 News';
    el.toolBody.innerHTML = `
      <input type="text" id="news-topic" class="text-field" placeholder="Topic (optional, e.g. technology)" />
      <button id="news-go" class="primary-btn">Get news</button>
      <div id="news-result"></div>
    `;
    openModal(el.toolModal);
    document.getElementById('news-go').onclick = async () => {
      const topic = document.getElementById('news-topic').value.trim();
      const resultEl = document.getElementById('news-result');
      resultEl.innerHTML = '<div class="tool-result">Loading…</div>';
      try {
        const res = await fetch(`${API}/api/news${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        resultEl.innerHTML = data.articles
          .map(
            (a) =>
              `<div class="tool-result"><strong>${a.title}</strong><br/><span class="muted">${a.source || ''}</span><br/><a href="${a.url}" target="_blank" rel="noopener">Read more</a></div>`
          )
          .join('');
      } catch (err) {
        resultEl.innerHTML = `<div class="tool-result">${err.message || 'Could not fetch news.'}</div>`;
      }
    };
  }

  function runSearchFlow() {
    el.toolTitle.textContent = '🛰️ Web Search';
    el.toolBody.innerHTML = `
      <input type="text" id="search-q" class="text-field" placeholder="Search the web…" />
      <button id="search-go" class="primary-btn">Search</button>
      <div id="search-result"></div>
    `;
    openModal(el.toolModal);
    document.getElementById('search-go').onclick = async () => {
      const q = document.getElementById('search-q').value.trim();
      const resultEl = document.getElementById('search-result');
      if (!q) return;
      resultEl.innerHTML = '<div class="tool-result">Searching…</div>';
      try {
        const res = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        resultEl.innerHTML = data.results
          .map(
            (r) =>
              `<div class="tool-result"><a href="${r.url}" target="_blank" rel="noopener"><strong>${r.title}</strong></a><br/><span class="muted">${r.description || ''}</span></div>`
          )
          .join('');
      } catch (err) {
        resultEl.innerHTML = `<div class="tool-result">${err.message || 'Search unavailable.'}</div>`;
      }
    };
  }

  function runImageFlow() {
    el.toolTitle.textContent = '🖼️ Image AI';
    el.toolBody.innerHTML = `
      <p class="muted">Describe the image you want INFINITY AI to create.</p>
      <textarea id="image-prompt" class="text-field" rows="3" placeholder="A glowing infinity symbol made of stardust…"></textarea>
      <button id="image-go" class="primary-btn">Generate image</button>
      <div id="image-result"></div>
    `;
    openModal(el.toolModal);
    document.getElementById('image-go').onclick = async () => {
      const prompt = document.getElementById('image-prompt').value.trim();
      const resultEl = document.getElementById('image-result');
      if (!prompt) return;
      resultEl.innerHTML = '<div class="tool-result">Generating…</div>';
      try {
        const res = await fetch(`${API}/api/image/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Image generation unavailable.');
        resultEl.innerHTML = `<div class="tool-result"><img src="data:${data.mimeType};base64,${data.imageBase64}" /><p>${data.caption || ''}</p></div>`;
      } catch (err) {
        resultEl.innerHTML = `<div class="tool-result">${err.message}</div>`;
      }
    };
  }

  function runVideoFlow() {
    el.toolTitle.textContent = '🎬 Video AI';
    el.toolBody.innerHTML = `
      <p class="muted">Describe a video idea — INFINITY AI will write a full shot-by-shot script/storyboard (video rendering itself isn't included, this focuses on planning &amp; scripting).</p>
      <textarea id="video-prompt" class="text-field" rows="3" placeholder="A 30-second product launch video for a smartwatch…"></textarea>
      <button id="video-go" class="primary-btn">Generate script</button>
      <div id="video-result"></div>
    `;
    openModal(el.toolModal);
    document.getElementById('video-go').onclick = async () => {
      const prompt = document.getElementById('video-prompt').value.trim();
      const resultEl = document.getElementById('video-result');
      if (!prompt) return;
      resultEl.innerHTML = '<div class="tool-result">Writing script…</div>';
      try {
        const res = await fetch(`${API}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Write a detailed shot-by-shot video script/storyboard for: ${prompt}`,
            mode: 'creative',
            history: [],
          }),
        });
        const data = await res.json();
        resultEl.innerHTML = `<div class="tool-result">${(data.reply || 'No response.').replace(/\n/g, '<br/>')}</div>`;
      } catch {
        resultEl.innerHTML = '<div class="tool-result">Could not generate a script right now.</div>';
      }
    };
  }

  // ---------------------------------------------------------------------
  // Owner Mode UI wiring
  // ---------------------------------------------------------------------
  function updateOwnerStatusDisplay() {
    el.ownerStatusDisplay.textContent = window.InfinityOwner.isOwner() ? '✅ Verified owner' : 'Not verified';
    el.deviceIdDisplay.textContent = state.deviceId;
  }

  function resetOwnerModalSteps() {
    el.ownerStepPassword.hidden = false;
    el.ownerStepBiometric.hidden = true;
    el.ownerStepPanel.hidden = true;
    el.ownerPassword.value = '';
    el.ownerPasswordError.textContent = '';
    el.ownerBiometricError.textContent = '';
  }

  async function openOwnerModal() {
    resetOwnerModalSteps();
    if (window.InfinityOwner.isOwner()) {
      await showOwnerPanel();
    }
    openModal(el.ownerModal);
  }

  async function showOwnerPanel() {
    el.ownerStepPassword.hidden = true;
    el.ownerStepBiometric.hidden = true;
    el.ownerStepPanel.hidden = false;
    updateOwnerStatusDisplay();
    try {
      const config = await window.InfinityOwner.getConfig();
      el.ownerAppName.value = config.appName || 'INFINITY AI';
      el.ownerDefaultMode.value = config.defaultMode || 'assistant';
      el.ownerTheme.value = config.theme || 'nebula-violet';
      el.ownerSystemPrompt.value = config.systemPromptOverride || '';
      el.ownerMemoryToggle.checked = !!config.memoryEnabled;
    } catch (e) {
      el.ownerSaveStatus.textContent = '';
    }
  }

  // ---------------------------------------------------------------------
  // Event bindings
  // ---------------------------------------------------------------------
  function bindEvents() {
    el.menuBtn.addEventListener('click', openDrawer);
    el.drawerClose.addEventListener('click', closeDrawer);
    el.drawerOverlay.addEventListener('click', closeDrawer);

    el.sendBtn.addEventListener('click', sendMessage);
    el.textInput.addEventListener('input', autoResizeTextarea);
    el.textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    el.attachBtn.addEventListener('click', () => el.fileInput.click());
    el.fileInput.addEventListener('change', (e) => {
      handleFileSelected(e.target.files[0]);
      el.fileInput.value = '';
    });

    el.micBtn.addEventListener('click', () => {
      if (!window.InfinityVoice.isSupported()) {
        appendMessage('ai', 'Voice input is not supported in this browser.', { refused: true });
        return;
      }
      if (window.InfinityVoice.listening) {
        window.InfinityVoice.stopListening();
        el.micBtn.classList.remove('listening');
        return;
      }
      el.micBtn.classList.add('listening');
      window.InfinityVoice.startListening({
        lang: state.settings.language,
        onResult: ({ interim, final }) => {
          el.textInput.value = final || interim;
          autoResizeTextarea();
        },
        onEnd: () => {
          el.micBtn.classList.remove('listening');
        },
        onError: () => {
          el.micBtn.classList.remove('listening');
        },
      });
    });

    el.newChatBtn.addEventListener('click', startNewChat);

    // Tool drawer items
    document.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        closeDrawer();
        const tool = btn.dataset.tool;
        if (tool === 'ocr') runOcrFlow();
        else if (tool === 'weather') runWeatherFlow();
        else if (tool === 'news') runNewsFlow();
        else if (tool === 'search') runSearchFlow();
        else if (tool === 'image') runImageFlow();
        else if (tool === 'video') runVideoFlow();
      });
    });

    // Profile
    el.profileBtn.addEventListener('click', () => {
      updateOwnerStatusDisplay();
      el.profileName.value = localStorage.getItem('infinity_profile_name') || '';
      openModal(el.profileModal);
    });
    el.profileName.addEventListener('input', () => {
      localStorage.setItem('infinity_profile_name', el.profileName.value);
    });

    // Settings
    el.settingsBtn.addEventListener('click', () => {
      closeDrawer();
      openModal(el.settingsModal);
    });
    el.voiceSelect.addEventListener('change', () => {
      state.settings.voiceName = el.voiceSelect.value || null;
      saveSettings();
    });
    el.languageSelect.addEventListener('change', () => {
      state.settings.language = el.languageSelect.value;
      saveSettings();
    });
    el.ttsToggle.addEventListener('change', () => {
      state.settings.ttsEnabled = el.ttsToggle.checked;
      saveSettings();
    });
    el.themeSelect.addEventListener('change', () => {
      state.settings.theme = el.themeSelect.value;
      document.body.setAttribute('data-theme', state.settings.theme);
      saveSettings();
    });
    el.memoryToggle.addEventListener('change', () => {
      state.settings.memoryEnabled = el.memoryToggle.checked;
      saveSettings();
    });
    el.clearMemoryBtn.addEventListener('click', async () => {
      await fetch(`${API}/api/memory`, { method: 'DELETE', headers: withDeviceHeaders() });
      el.clearMemoryBtn.textContent = 'Memory cleared ✓';
      setTimeout(() => (el.clearMemoryBtn.textContent = 'Clear my memory'), 1500);
    });
    el.clearHistoryBtn.addEventListener('click', () => {
      state.conversations = [];
      localStorage.setItem('infinity_conversations', '[]');
      renderHistoryList();
      el.clearHistoryBtn.textContent = 'History cleared ✓';
      setTimeout(() => (el.clearHistoryBtn.textContent = 'Clear chat history'), 1500);
    });

    // Owner mode
    el.ownerBtn.addEventListener('click', () => {
      closeDrawer();
      openOwnerModal();
    });

    el.ownerPasswordSubmit.addEventListener('click', async () => {
      el.ownerPasswordError.textContent = '';
      try {
        await window.InfinityOwner.submitPassword(el.ownerPassword.value);
        el.ownerStepPassword.hidden = true;
        el.ownerStepBiometric.hidden = false;
      } catch (err) {
        el.ownerPasswordError.textContent = err.message;
      }
    });

    el.ownerBiometricBtn.addEventListener('click', async () => {
      el.ownerBiometricError.textContent = '';
      try {
        await window.InfinityOwner.verifyBiometric();
        await showOwnerPanel();
      } catch (err) {
        el.ownerBiometricError.textContent = err.message;
      }
    });

    el.ownerBiometricRegisterBtn.addEventListener('click', async () => {
      el.ownerBiometricError.textContent = '';
      try {
        await window.InfinityOwner.registerBiometric();
        el.ownerBiometricError.textContent = 'Registered! Now tap "Verify" to finish signing in.';
        el.ownerBiometricError.classList.add('success-text');
      } catch (err) {
        el.ownerBiometricError.textContent = err.message;
      }
    });

    el.ownerSaveBtn.addEventListener('click', async () => {
      try {
        await window.InfinityOwner.saveConfig({
          appName: el.ownerAppName.value,
          defaultMode: el.ownerDefaultMode.value,
          theme: el.ownerTheme.value,
          systemPromptOverride: el.ownerSystemPrompt.value,
          memoryEnabled: el.ownerMemoryToggle.checked,
        });
        el.ownerSaveStatus.textContent = 'Saved ✓ — reloading app config…';
        document.body.setAttribute('data-theme', el.ownerTheme.value);
        setTimeout(() => (el.ownerSaveStatus.textContent = ''), 2500);
      } catch (err) {
        el.ownerSaveStatus.textContent = err.message;
      }
    });

    el.ownerLogoutBtn.addEventListener('click', () => {
      window.InfinityOwner.logout();
      updateOwnerStatusDisplay();
      closeModal(el.ownerModal);
    });

    // Generic modal close
    document.querySelectorAll('.close-modal').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        closeModal(modal);
      });
    });
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(overlay);
      });
    });

    setupKeyboardAwareInput();
  }
})();
