/**
 * TUNGSTON — Unified Foundry Engine
 * Integrates Main Dashboard, Flagship AI Chatbot, and Autonomous HTML Playground
 * with high-torque brutalist mechanical transitions and zero page reload latency.
 */

// ============================================================
// 1. PROCEDURAL AUDIO SYNTHESIZER (Web Audio API)
// ============================================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playMechanicalClick(pitch = 700) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    // Audio optional, fail silently
  }
}

// ============================================================
// 2. LIVE CLOCK & FOOTER
// ============================================================
function tick() {
  const el = document.getElementById('clock');
  if (!el) return;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  el.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
tick();
setInterval(tick, 1000);

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ============================================================
// 3. UNIFIED VIEW ROUTER & SHUTTER TRANSITION ENGINE
// ============================================================
let currentView = 'dashboard';
let isTransitioning = false;

const VIEW_TITLES = {
  dashboard: 'FOUNDRY // DASHBOARD',
  ai: 'CORE-00 // TUNGSTON AI',
  playground: 'BUILDER-01 // APP PLAYGROUND'
};

function switchView(viewId, skipAnimation = false) {
  if (isTransitioning) return;
  if (!['dashboard', 'ai', 'playground'].includes(viewId)) viewId = 'dashboard';

  playMechanicalClick(viewId === 'dashboard' ? 520 : 880);

  const shutter = document.getElementById('matrix-shutter');
  const shutterText = document.getElementById('shutter-text');

  if (skipAnimation || !shutter) {
    applyViewChange(viewId);
    return;
  }

  isTransitioning = true;
  if (shutterText) shutterText.textContent = VIEW_TITLES[viewId] || 'ENGAGING TOOL...';
  shutter.classList.add('shutter-active');

  // Halfway through mechanical sweep: switch DOM views
  setTimeout(() => {
    applyViewChange(viewId);

    // Open shutter back up
    setTimeout(() => {
      shutter.classList.remove('shutter-active');
      isTransitioning = false;
    }, 130);
  }, 130);
}

function applyViewChange(viewId) {
  currentView = viewId;

  // Toggle view containers
  document.querySelectorAll('.app-view').forEach((el) => {
    el.classList.remove('active');
  });
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) targetView.classList.add('active');

  // Toggle active tab buttons
  document.querySelectorAll('.switcher-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  const activeTab = document.getElementById(`tab-${viewId}`);
  if (activeTab) activeTab.classList.add('active');

  // Update URL hash / history cleanly
  const hash = `#${viewId}`;
  if (window.location.hash !== hash) {
    history.replaceState({ view: viewId }, '', hash);
  }

  // View-specific initializations
  if (viewId === 'ai') {
    scrollChatBottom();
    const input = document.getElementById('chat-input');
    if (input && window.innerWidth >= 768) input.focus();
  } else if (viewId === 'playground') {
    if (!currentHtml) currentHtml = DEFAULT_APP_HTML;
    renderIframe(currentHtml);
  }
}

// Deep linking and Popstate routing
window.addEventListener('popstate', (e) => {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    switchView(hash, false);
  } else {
    switchView('dashboard', false);
  }
});

// Check initial route
function initInitialRoute() {
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase().replace('#', '');

  if (hash === 'playground' || path.includes('playground') || path.includes('builder')) {
    switchView('playground', true);
  } else if (hash === 'ai' || hash === 'chat' || path.includes('ai') || path.includes('chat')) {
    switchView('ai', true);
  } else {
    switchView('dashboard', true);
  }
}

// ============================================================
// 4. TUNGSTON AI — FLAGSHIP CHAT ENGINE
// ============================================================
const CHAT_API_ENDPOINT = 'https://tungston-ai.vercel.app/api/chat';

let chatMessages = [];
let isChatStreaming = false;
let chatAbortController = null;
let currentChatModel = 'qwen-2.5-72b';

// Load existing chat history from localStorage
try {
  const saved = localStorage.getItem('tungsten_ai_chat_v1');
  if (saved) chatMessages = JSON.parse(saved);
} catch (e) {
  chatMessages = [];
}

function setChatModel(modelKey) {
  currentChatModel = modelKey;
  document.querySelectorAll('.model-opt').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.model === modelKey);
  });
  playMechanicalClick(650);
}

function renderChatUI() {
  const scrollContainer = document.getElementById('chat-scroll');
  const welcomeHero = document.getElementById('chat-welcome');
  const messageList = document.getElementById('chat-message-list');
  if (!messageList) return;

  if (chatMessages.length === 0) {
    if (welcomeHero) welcomeHero.style.display = 'block';
    messageList.innerHTML = '';
    return;
  }

  if (welcomeHero) welcomeHero.style.display = 'none';
  messageList.innerHTML = '';

  chatMessages.forEach((msg, idx) => {
    const isUser = msg.role === 'user';
    const row = document.createElement('div');
    row.className = `msg-item ${isUser ? 'msg-item--user' : 'msg-item--assistant'}`;

    if (isUser) {
      row.innerHTML = `
        <div class="msg-bubble-user">
          <div class="msg-header">
            <span>YOU</span>
            <span>${msg.time || ''}</span>
          </div>
          <div class="msg-body whitespace-pre-wrap">${escapeHtml(msg.content)}</div>
        </div>
      `;
    } else {
      const parsedHtml = renderMarkdown(msg.content);
      row.innerHTML = `
        <div class="msg-bubble-assistant">
          <div class="msg-header">
            <span class="msg-tag-assistant"><span class="dot"></span>W-74 // TUNGSTON AI</span>
            <span>${msg.model || 'GROQ 72B'}</span>
          </div>
          <div class="msg-body" id="msg-body-${idx}">${parsedHtml}</div>
        </div>
      `;
    }
    messageList.appendChild(row);
  });

  decorateCodeBlocks(messageList);
  scrollChatBottom();
}

function renderMarkdown(rawText) {
  if (!rawText) return '<span class="cursor-blink"></span>';
  try {
    if (window.marked && typeof window.marked.parse === 'function') {
      return window.marked.parse(rawText);
    }
  } catch (e) {
    // Fallback to basic text escaping
  }
  return `<p>${escapeHtml(rawText)}</p>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function decorateCodeBlocks(container) {
  const preElements = container.querySelectorAll('pre');
  preElements.forEach((pre) => {
    if (pre.closest('.code-block-wrap')) return;

    const code = pre.querySelector('code');
    const langMatch = code ? code.className.match(/language-([a-zA-Z0-9_-]+)/) : null;
    const lang = langMatch ? langMatch[1] : 'TEXT';
    const rawCode = code ? code.innerText : pre.innerText;

    const wrap = document.createElement('div');
    wrap.className = 'code-block-wrap';

    const head = document.createElement('div');
    head.className = 'code-block-head';
    head.innerHTML = `
      <span class="code-lang-tag">${lang.toUpperCase()}</span>
      <button type="button" class="code-copy-btn">COPY CODE</button>
    `;

    const copyBtn = head.querySelector('.code-copy-btn');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(rawCode).then(() => {
        copyBtn.textContent = 'COPIED! ✓';
        copyBtn.style.background = '#FFB800';
        copyBtn.style.color = '#111';
        setTimeout(() => {
          copyBtn.textContent = 'COPY CODE';
          copyBtn.style.background = '';
          copyBtn.style.color = '';
        }, 2000);
      });
    });

    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(head);
    wrap.appendChild(pre);
  });

  // Wrap tables for zero mobile horizontal blowout
  const tables = container.querySelectorAll('table');
  tables.forEach((table) => {
    if (table.closest('.table-scroll')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

function scrollChatBottom() {
  const scrollContainer = document.getElementById('chat-scroll');
  if (scrollContainer) {
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }
}

async function handleChatSubmit(e) {
  if (e) e.preventDefault();
  if (isChatStreaming) return;

  const textarea = document.getElementById('chat-input');
  if (!textarea) return;
  const prompt = textarea.value.trim();
  if (!prompt) return;

  textarea.value = '';
  textarea.style.height = 'auto';

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 1. Add user message
  chatMessages.push({
    role: 'user',
    content: prompt,
    time: timeStr
  });

  // 2. Add assistant placeholder
  const assistantIdx = chatMessages.length;
  chatMessages.push({
    role: 'assistant',
    content: '',
    model: currentChatModel.toUpperCase(),
    time: timeStr
  });

  renderChatUI();
  scrollChatBottom();

  isChatStreaming = true;
  toggleChatControls(true);
  chatAbortController = new AbortController();

  const assistantBody = document.getElementById(`msg-body-${assistantIdx}`);
  if (assistantBody) {
    assistantBody.innerHTML = '<span class="cursor-blink"></span>';
  }

  let accumulatedResponse = '';

  try {
    const payload = {
      messages: chatMessages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content
      })),
      modelOverride: currentChatModel
    };

    const res = await fetch(CHAT_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: chatAbortController.signal
    });

    if (!res.ok) {
      let errText = `Server error (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson.error) errText = errJson.error;
      } catch (_) {}
      throw new Error(errText);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      accumulatedResponse += chunk;
      chatMessages[assistantIdx].content = accumulatedResponse;

      if (assistantBody) {
        assistantBody.innerHTML = renderMarkdown(accumulatedResponse) + '<span class="cursor-blink"></span>';
        decorateCodeBlocks(assistantBody);
      }
      scrollChatBottom();
    }

    // Final render without cursor
    if (assistantBody) {
      assistantBody.innerHTML = renderMarkdown(accumulatedResponse);
      decorateCodeBlocks(assistantBody);
    }

    // Save to localStorage
    try {
      localStorage.setItem('tungsten_ai_chat_v1', JSON.stringify(chatMessages.slice(-24)));
    } catch (_) {}
  } catch (err) {
    if (err.name === 'AbortError') {
      accumulatedResponse += '\n\n*[Generation stopped by user]*';
    } else {
      accumulatedResponse += `\n\n**[TRANSMISSION ERROR]**: ${err.message || String(err)}`;
    }
    chatMessages[assistantIdx].content = accumulatedResponse;
    if (assistantBody) {
      assistantBody.innerHTML = renderMarkdown(accumulatedResponse);
      decorateCodeBlocks(assistantBody);
    }
  } finally {
    isChatStreaming = false;
    chatAbortController = null;
    toggleChatControls(false);
    scrollChatBottom();
  }
}

function stopChatGeneration() {
  if (chatAbortController) {
    chatAbortController.abort();
  }
}

function toggleChatControls(streaming) {
  const sendBtn = document.getElementById('chat-btn-send');
  const stopBtn = document.getElementById('chat-btn-stop');
  if (sendBtn) sendBtn.style.display = streaming ? 'none' : 'inline-flex';
  if (stopBtn) stopBtn.style.display = streaming ? 'inline-flex' : 'none';
}

function newChat() {
  if (isChatStreaming) stopChatGeneration();
  chatMessages = [];
  try {
    localStorage.removeItem('tungsten_ai_chat_v1');
  } catch (_) {}
  renderChatUI();
  playMechanicalClick(440);
}

function exportChat() {
  if (chatMessages.length === 0) {
    alert('No messages to export.');
    return;
  }
  let md = '# TUNGSTON AI — CONVERSATION EXPORT\n\n';
  md += `Exported: ${new Date().toISOString()}\n\n---\n\n`;
  chatMessages.forEach((m) => {
    md += `### ${m.role === 'user' ? 'USER' : 'TUNGSTON AI (' + (m.model || 'GROQ') + ')'}\n\n`;
    md += `${m.content}\n\n---\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tungston-chat-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function sendPromptSuggestion(text) {
  const textarea = document.getElementById('chat-input');
  if (textarea) {
    textarea.value = text;
    handleChatSubmit();
  }
}

// Auto-grow textarea for chat composer
const chatInput = document.getElementById('chat-input');
if (chatInput) {
  chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 180) + 'px';
  });

  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  });
}

// ============================================================
// 5. HTML APP PLAYGROUND — STUDIO ENGINE
// ============================================================
const PLAYGROUND_API = 'https://tungston-ai.vercel.app/api/playground/generate';

const DEFAULT_APP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tungsten Focus & Tasks</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #24272B; color: #F2EFE6; font-family: monospace; }
    .shadow-hard { box-shadow: 4px 4px 0 #0B0C0D; }
    .shadow-hard-sm { box-shadow: 2px 2px 0 #0B0C0D; }
  </style>
</head>
<body class="p-4 sm:p-6 min-h-screen flex flex-col items-center justify-center">
  <div class="w-full max-w-lg border-2 border-[#0B0C0D] bg-[#2E3237] p-4 sm:p-6 shadow-hard space-y-5">
    <div class="flex items-center justify-between border-b-2 border-[#0B0C0D] pb-3">
      <div class="flex items-center gap-2">
        <span class="grid h-7 w-7 place-items-center bg-[#FFB800] text-[#0B0C0D] font-black text-sm">74</span>
        <h1 class="text-sm sm:text-base font-bold tracking-tight uppercase">FOCUS & TASK WORKBENCH</h1>
      </div>
      <span class="bg-[#3A3F45] border border-[#0B0C0D] px-2 py-0.5 text-[10px] font-bold text-[#FFB800]">READY</span>
    </div>

    <div class="border-2 border-[#0B0C0D] bg-[#24272B] p-4 sm:p-5 text-center shadow-hard space-y-3">
      <div id="timer-display" class="text-4xl sm:text-5xl font-black text-[#FFB800] tracking-wider">25:00</div>
      <div class="flex flex-wrap justify-center gap-2">
        <button id="btn-toggle" onclick="toggleTimer()" class="border-2 border-[#0B0C0D] bg-[#FFB800] text-[#0B0C0D] px-4 py-1.5 text-xs font-black uppercase shadow-hard-sm">START</button>
        <button onclick="resetTimer(25)" class="border-2 border-[#0B0C0D] bg-[#3A3F45] text-[#F2EFE6] px-3 py-1.5 text-xs font-bold uppercase shadow-hard-sm">25M</button>
        <button onclick="resetTimer(5)" class="border-2 border-[#0B0C0D] bg-[#3A3F45] text-[#F2EFE6] px-3 py-1.5 text-xs font-bold uppercase shadow-hard-sm">5M</button>
      </div>
    </div>

    <div class="space-y-3">
      <div class="text-xs font-bold text-[#FFB800] uppercase tracking-wider">Daily Directives</div>
      <div class="flex gap-2">
        <input id="task-input" type="text" placeholder="Add a new task..." class="flex-1 border-2 border-[#0B0C0D] bg-[#24272B] px-3 py-1.5 text-xs text-[#F2EFE6] focus:outline-none focus:border-[#FFB800]" onkeydown="if(event.key==='Enter') addTask()">
        <button onclick="addTask()" class="border-2 border-[#0B0C0D] bg-[#FFB800] text-[#0B0C0D] px-3 py-1.5 text-xs font-black uppercase shadow-hard-sm">+</button>
      </div>
      <ul id="task-list" class="space-y-1.5 text-xs max-h-40 overflow-y-auto"></ul>
    </div>
  </div>

  <script>
    let timeLeft = 1500;
    let timerId = null;
    function updateDisplay() {
      const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
      const s = (timeLeft % 60).toString().padStart(2, '0');
      document.getElementById('timer-display').innerText = m + ':' + s;
    }
    function toggleTimer() {
      const btn = document.getElementById('btn-toggle');
      if (timerId) { clearInterval(timerId); timerId = null; btn.innerText = 'RESUME'; }
      else {
        timerId = setInterval(() => {
          if (timeLeft > 0) { timeLeft--; updateDisplay(); }
          else { clearInterval(timerId); timerId = null; btn.innerText = 'START'; alert('Timer complete!'); }
        }, 1000);
        btn.innerText = 'PAUSE';
      }
    }
    function resetTimer(m) {
      if (timerId) clearInterval(timerId);
      timerId = null; timeLeft = m * 60; updateDisplay();
      document.getElementById('btn-toggle').innerText = 'START';
    }
    let tasks = JSON.parse(localStorage.getItem('tungsten_demo_tasks') || '["Verify 4-key Groq pool", "Launch live HTML app", "Deploy to Vercel"]');
    function renderTasks() {
      const list = document.getElementById('task-list');
      list.innerHTML = '';
      tasks.forEach((t, i) => {
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between border border-[#0B0C0D] bg-[#24272B] px-3 py-1.5 text-xs';
        li.innerHTML = '<span>' + t + '</span><button onclick="deleteTask(' + i + ')" class="text-[#FF3B30] hover:text-[#FFB800] font-bold">×</button>';
        list.appendChild(li);
      });
      localStorage.setItem('tungsten_demo_tasks', JSON.stringify(tasks));
    }
    function addTask() {
      const inp = document.getElementById('task-input');
      const v = inp.value.trim();
      if (!v) return;
      tasks.push(v); inp.value = ''; renderTasks();
    }
    function deleteTask(i) { tasks.splice(i, 1); renderTasks(); }
    renderTasks();
  <\/script>
</body>
</html>`;

const BLUEPRINTS = [
  {
    icon: '⏱️',
    title: 'Pomodoro & Task Board',
    desc: 'Customizable intervals, audio chime, and localStorage saving.',
    prompt: 'Create a brutalist Pomodoro Timer with customizable work/break intervals, sound chime, and a localStorage task list.'
  },
  {
    icon: '💰',
    title: 'Invoice & Tax Generator',
    desc: 'Line-item invoicing, automatic tax calculating, and 1-click PDF print.',
    prompt: "Build an interactive client invoice generator that calculates subtotal, discounts, tax rates, and has a 1-click 'Print to PDF' view."
  },
  {
    icon: '📊',
    title: 'Kanban Board Drag & Drop',
    desc: '3-column workflow board with interactive task card dragging.',
    prompt: 'Create a 3-column Kanban board (To Do, In Progress, Done) with smooth drag and drop, color tags, and localStorage saving.'
  },
  {
    icon: '🎨',
    title: 'WCAG Contrast & Palette',
    desc: 'Color generator testing contrast ratios against WCAG AAA.',
    prompt: 'Build an interactive color palette generator that tests foreground/background contrast ratios against WCAG AA and AAA standards in real time.'
  },
  {
    icon: '📝',
    title: 'Markdown Scratchpad',
    desc: 'Split-screen editor with real-time preview, word count, and HTML export.',
    prompt: 'Create a distraction-free split-screen Markdown editor with live preview, word/character count, reading time, and HTML export.'
  },
  {
    icon: '🕹️',
    title: 'Retro 80s Arcade Game',
    desc: 'HTML5 canvas arcade game with keyboard controls and score tracker.',
    prompt: 'Build a retro 80s arcade game in HTML5 canvas with sound effects, high score tracker in localStorage, and keyboard controls.'
  }
];

let currentHtml = DEFAULT_APP_HTML;
let isPlaygroundGenerating = false;
let playgroundGenerationMode = 'refine'; // "refine" | "fresh"
let playgroundDeskTab = 'preview'; // "preview" | "split" | "code"
let playgroundSplitRatio = '50-50'; // "50-50" | "70-30" | "30-70"
let playgroundVersion = 1;
let playgroundHistory = [];

function initBlueprints() {
  const bpContainer = document.getElementById('blueprints-container');
  if (!bpContainer || bpContainer.children.length > 0) return;

  BLUEPRINTS.forEach((b) => {
    const btn = document.createElement('button');
    btn.className = 'border-2 border-[#111111] bg-[#EEEEE6] p-2.5 text-left font-mono hover:border-[#FFB800] transition-colors shadow-hard-sm group w-full';
    btn.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-base">${b.icon}</span>
        <span class="font-bold text-xs group-hover:text-[#FFB800]">${b.title}</span>
      </div>
      <p class="text-[11px] text-[#6B6B63] mt-1 line-clamp-2 leading-relaxed">${b.desc}</p>
    `;
    btn.onclick = () => {
      const inp = document.getElementById('prompt-input');
      if (inp) inp.value = b.prompt;
      setPlaygroundMode('fresh');
      updatePromptUIState();
      handlePlaygroundGenerate(b.prompt);
    };
    bpContainer.appendChild(btn);
  });
}

function setPaneRatio(pct) {
  const clamped = Math.min(75, Math.max(20, pct));
  const leftPane = document.getElementById('left-pane');
  const slider = document.getElementById('workspace-ratio-slider');
  const display = document.getElementById('ratio-display');

  if (window.innerWidth >= 1024 && leftPane) {
    leftPane.style.width = clamped + '%';
    if (slider) slider.value = clamped;
    if (display) display.innerText = `${clamped}% / ${100 - clamped}%`;
    try {
      localStorage.setItem('tungsten_playground_ratio', clamped);
    } catch (_) {}
  }
}

function handleSliderInput(val) {
  setPaneRatio(parseInt(val, 10));
}

function initSplitterDrag() {
  const splitter = document.getElementById('drag-splitter');
  const workspaceContainer = document.getElementById('workspace-container');
  if (!splitter || !workspaceContainer) return;

  let isDragging = false;

  splitter.addEventListener('mousedown', () => {
    isDragging = true;
    document.body.classList.add('resizing');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = workspaceContainer.getBoundingClientRect();
    const offset = e.clientX - rect.left;
    const pct = (offset / rect.width) * 100;
    setPaneRatio(Math.round(pct));
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.classList.remove('resizing');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  });

  // Touch drag support for mobile / tablets
  splitter.addEventListener('touchstart', () => {
    isDragging = true;
    document.body.classList.add('resizing');
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging || !e.touches[0]) return;
    const rect = workspaceContainer.getBoundingClientRect();
    const offset = e.touches[0].clientX - rect.left;
    const pct = (offset / rect.width) * 100;
    setPaneRatio(Math.round(pct));
  }, { passive: true });

  window.addEventListener('touchend', () => {
    if (isDragging) {
      isDragging = false;
      document.body.classList.remove('resizing');
    }
  });
}

function renderIframe(htmlCode) {
  const iframe = document.getElementById('preview-iframe');
  if (!iframe) return;
  iframe.srcdoc = htmlCode;

  const codeDisplay = document.getElementById('code-display');
  if (codeDisplay) codeDisplay.innerText = htmlCode;

  const codeLengthDisplay = document.getElementById('code-length-display');
  if (codeLengthDisplay) codeLengthDisplay.innerText = new TextEncoder().encode(htmlCode).length + ' bytes';
}

let playgroundMobileTab = 'builder';

function setMobilePlaygroundTab(tab) {
  playgroundMobileTab = tab;
  playMechanicalClick(550);

  const leftPane = document.getElementById('left-pane');
  const rightPane = document.getElementById('right-pane');
  const previewWrap = document.getElementById('preview-wrapper');
  const codeWrap = document.getElementById('code-wrapper');

  ['mob-tab-builder', 'mob-tab-preview', 'mob-tab-code'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('bg-[#FFB800]');
      el.classList.add('bg-[#EEEEE6]');
    }
  });

  const activeBtn = document.getElementById(`mob-tab-${tab}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-[#FFB800]');
    activeBtn.classList.remove('bg-[#EEEEE6]');
  }

  if (window.innerWidth < 1024) {
    if (tab === 'builder') {
      if (leftPane) leftPane.classList.remove('hidden');
      if (rightPane) rightPane.classList.add('hidden');
    } else if (tab === 'preview') {
      if (leftPane) leftPane.classList.add('hidden');
      if (rightPane) rightPane.classList.remove('hidden');
      if (previewWrap) { previewWrap.classList.remove('hidden'); previewWrap.style.width = '100%'; }
      if (codeWrap) codeWrap.classList.add('hidden');
    } else if (tab === 'code') {
      if (leftPane) leftPane.classList.add('hidden');
      if (rightPane) rightPane.classList.remove('hidden');
      if (previewWrap) previewWrap.classList.add('hidden');
      if (codeWrap) { codeWrap.classList.remove('hidden'); codeWrap.style.width = '100%'; }
    }
  }
}

window.addEventListener('resize', () => {
  if (window.innerWidth >= 1024) {
    const leftPane = document.getElementById('left-pane');
    const rightPane = document.getElementById('right-pane');
    if (leftPane) leftPane.classList.remove('hidden');
    if (rightPane) rightPane.classList.remove('hidden');
  } else {
    setMobilePlaygroundTab(playgroundMobileTab);
  }
});

function setDeskTab(tab) {
  playgroundDeskTab = tab;
  playMechanicalClick(600);

  const previewWrap = document.getElementById('preview-wrapper');
  const codeWrap = document.getElementById('code-wrapper');
  const splitControls = document.getElementById('split-ratio-controls');
  const rightPane = document.getElementById('right-pane');

  ['btn-tab-preview', 'btn-tab-split', 'btn-tab-code'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('bg-[#FFB800]', 'text-[#111111]');
  });

  const activeBtn = document.getElementById(`btn-tab-${tab}`);
  if (activeBtn) activeBtn.classList.add('bg-[#FFB800]', 'text-[#111111]');

  if (tab === 'preview') {
    if (previewWrap) { previewWrap.classList.remove('hidden'); previewWrap.style.width = '100%'; }
    if (codeWrap) codeWrap.classList.add('hidden');
    if (splitControls) splitControls.classList.add('hidden');
    if (rightPane) rightPane.classList.remove('flex-row');
  } else if (tab === 'code') {
    if (previewWrap) previewWrap.classList.add('hidden');
    if (codeWrap) { codeWrap.classList.remove('hidden'); codeWrap.style.width = '100%'; }
    if (splitControls) splitControls.classList.add('hidden');
    if (rightPane) rightPane.classList.remove('flex-row');
  } else if (tab === 'split') {
    if (previewWrap) previewWrap.classList.remove('hidden');
    if (codeWrap) codeWrap.classList.remove('hidden');
    if (splitControls) splitControls.classList.remove('hidden');
    if (rightPane) rightPane.classList.add('flex-row');
    applySplitRatio(playgroundSplitRatio);
  }
}

function applySplitRatio(ratio) {
  playgroundSplitRatio = ratio;
  const previewWrap = document.getElementById('preview-wrapper');
  const codeWrap = document.getElementById('code-wrapper');

  ['split-btn-50-50', 'split-btn-70-30', 'split-btn-30-70'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('bg-[#FFB800]', 'text-[#111111]');
  });
  const activeBtn = document.getElementById(`split-btn-${ratio}`);
  if (activeBtn) activeBtn.classList.add('bg-[#FFB800]', 'text-[#111111]');

  if (window.innerWidth >= 768 && previewWrap && codeWrap) {
    if (ratio === '50-50') {
      previewWrap.style.width = '50%';
      codeWrap.style.width = '50%';
    } else if (ratio === '70-30') {
      previewWrap.style.width = '70%';
      codeWrap.style.width = '30%';
    } else if (ratio === '30-70') {
      previewWrap.style.width = '30%';
      codeWrap.style.width = '70%';
    }
  }
}

function setPlaygroundMode(mode) {
  playgroundGenerationMode = mode;
  playMechanicalClick(500);

  const btnRefine = document.getElementById('mode-btn-refine');
  const btnFresh = document.getElementById('mode-btn-fresh');
  const label = document.getElementById('mode-status-label');

  if (mode === 'refine') {
    if (btnRefine) { btnRefine.classList.add('bg-[#FFB800]', 'text-[#111111]'); btnRefine.classList.remove('bg-[#EEEEE6]'); }
    if (btnFresh) { btnFresh.classList.remove('bg-[#FFB800]', 'text-[#111111]'); btnFresh.classList.add('bg-[#EEEEE6]'); }
    if (label) label.innerText = 'MODE: ITERATING ON ACTIVE APP';
  } else {
    if (btnFresh) { btnFresh.classList.add('bg-[#FFB800]', 'text-[#111111]'); btnFresh.classList.remove('bg-[#EEEEE6]'); }
    if (btnRefine) { btnRefine.classList.remove('bg-[#FFB800]', 'text-[#111111]'); btnRefine.classList.add('bg-[#EEEEE6]'); }
    if (label) label.innerText = 'MODE: STARTING FROM FRESH CANV';
  }
}

function updatePromptUIState() {
  const inp = document.getElementById('prompt-input');
  const count = document.getElementById('char-count');
  if (inp && count) count.innerText = `${inp.value.length}/4000`;
}

function insertModifier(tag) {
  const inp = document.getElementById('prompt-input');
  if (!inp) return;
  inp.value = inp.value ? `${inp.value.trim()} ${tag}` : tag;
  inp.focus();
  updatePromptUIState();
  playMechanicalClick(600);
}

function toggleFocusMode() {
  document.body.classList.toggle('canvas-focus-mode');
  const btn = document.getElementById('focus-mode-btn');
  const isFocus = document.body.classList.contains('canvas-focus-mode');
  if (btn) btn.innerHTML = isFocus ? '<span>✕</span><span class="hidden sm:inline">EXIT FOCUS</span>' : '<span>⛶</span><span class="hidden sm:inline">FOCUS</span>';
  playMechanicalClick(isFocus ? 800 : 500);
}

function setLiveDockState(state) {
  const dock = document.getElementById('live-prompt-dock');
  const pill = document.getElementById('live-dock-minimized-pill');
  if (state === 'minimized') {
    if (dock) dock.classList.add('hidden');
    if (pill) pill.classList.remove('hidden');
  } else {
    if (dock) dock.classList.remove('hidden');
    if (pill) pill.classList.add('hidden');
    const input = document.getElementById('live-prompt-input');
    if (input) input.focus();
  }
}

function handleLiveDockSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('live-prompt-input');
  if (!input) return;
  const prompt = input.value.trim();
  if (!prompt) return;

  input.value = '';
  setPlaygroundMode('refine');
  handlePlaygroundGenerate(prompt);
}

function switchLeftTab(tab) {
  const btnBp = document.getElementById('left-tab-blueprints');
  const btnRev = document.getElementById('left-tab-revisions');
  const bpPane = document.getElementById('blueprints-pane');
  const revPane = document.getElementById('revisions-pane');

  if (tab === 'blueprints') {
    if (btnBp) { btnBp.classList.add('border-b-2', 'border-[#FFB800]', 'text-[#111111]'); btnBp.classList.remove('text-[#6B6B63]'); }
    if (btnRev) { btnRev.classList.remove('border-b-2', 'border-[#FFB800]', 'text-[#111111]'); btnRev.classList.add('text-[#6B6B63]'); }
    if (bpPane) bpPane.classList.remove('hidden');
    if (revPane) revPane.classList.add('hidden');
  } else {
    if (btnRev) { btnRev.classList.add('border-b-2', 'border-[#FFB800]', 'text-[#111111]'); btnRev.classList.remove('text-[#6B6B63]'); }
    if (btnBp) { btnBp.classList.remove('border-b-2', 'border-[#FFB800]', 'text-[#111111]'); btnBp.classList.add('text-[#6B6B63]'); }
    if (revPane) revPane.classList.remove('hidden');
    if (bpPane) bpPane.classList.add('hidden');
  }
}

function addRevisionEntry(ver, prompt, html, mode) {
  const rev = {
    version: ver,
    prompt: prompt,
    html: html,
    mode: mode,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
  playgroundHistory.unshift(rev);
  renderRevisionsList();
}

function renderRevisionsList() {
  const container = document.getElementById('revisions-container');
  const countBadge = document.getElementById('revision-count-badge');
  if (countBadge) countBadge.innerText = `(${playgroundHistory.length})`;
  if (!container) return;

  if (playgroundHistory.length === 0) {
    container.innerHTML = '<div class="text-[11px] text-[#6B6B63] italic p-3 text-center border-2 border-dashed border-[#111111]">No revisions generated yet.</div>';
    return;
  }

  container.innerHTML = '';
  playgroundHistory.forEach((r, idx) => {
    const card = document.createElement('div');
    card.className = 'border-2 border-[#111111] bg-[#EEEEE6] p-2.5 font-mono shadow-hard-sm space-y-1.5';
    card.innerHTML = `
      <div class="flex items-center justify-between text-[10px] font-bold border-b border-[#D8D8CF] pb-1">
        <span class="text-[#FFB800] bg-[#111111] px-1.5 py-0.2">v${r.version}</span>
        <span class="text-[#6B6B63]">${r.timestamp} • ${r.mode.toUpperCase()}</span>
      </div>
      <p class="text-xs font-medium text-[#111111] line-clamp-2">${escapeHtml(r.prompt)}</p>
      <div class="flex items-center justify-end gap-1.5 pt-1">
        <button onclick="editRevisionPrompt(${idx})" class="text-[10px] border border-[#111111] bg-white px-2 py-0.5 hover:bg-[#FFB800] font-bold">✏️ EDIT</button>
        <button onclick="restoreRevisionSnapshot(${idx})" class="text-[10px] border border-[#111111] bg-[#111111] text-[#FFB800] px-2 py-0.5 hover:bg-[#FFB800] hover:text-[#111111] font-bold">↺ RESTORE</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function editRevisionPrompt(idx) {
  const r = playgroundHistory[idx];
  if (!r) return;
  const inp = document.getElementById('prompt-input');
  if (inp) {
    inp.value = r.prompt;
    inp.focus();
    updatePromptUIState();
  }
}

function restoreRevisionSnapshot(idx) {
  const r = playgroundHistory[idx];
  if (!r) return;
  currentHtml = r.html;
  renderIframe(currentHtml);
  playMechanicalClick(750);
}

async function handlePlaygroundGenerate(explicitPrompt = null) {
  if (isPlaygroundGenerating) return;

  const promptInput = document.getElementById('prompt-input');
  const prompt = (explicitPrompt || (promptInput ? promptInput.value : '')).trim();

  if (!prompt) {
    alert('Please enter a description or select a blueprint.');
    return;
  }

  isPlaygroundGenerating = true;
  togglePlaygroundGeneratingUI(true);

  if (window.innerWidth < 1024) {
    setMobilePlaygroundTab('preview');
  }

  let accumulatedHtml = '';
  const isRefine = playgroundGenerationMode === 'refine' && currentHtml;

  try {
    const payload = {
      prompt: prompt,
      existingHtml: isRefine ? currentHtml : null,
      freeTestPass: true
    };

    const res = await fetch(PLAYGROUND_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Generation failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      accumulatedHtml += chunk;

      if (accumulatedHtml.includes('<!DOCTYPE') || accumulatedHtml.includes('<html')) {
        renderIframe(accumulatedHtml);
      }
    }

    if (accumulatedHtml.trim()) {
      currentHtml = accumulatedHtml;
      renderIframe(currentHtml);
      playgroundVersion++;
      addRevisionEntry(playgroundVersion, prompt, currentHtml, playgroundGenerationMode);
    }
  } catch (err) {
    alert(`Playground synthesis error: ${err.message || String(err)}`);
  } finally {
    isPlaygroundGenerating = false;
    togglePlaygroundGeneratingUI(false);
  }
}

function togglePlaygroundGeneratingUI(generating) {
  const btn = document.getElementById('generate-btn');
  const liveBtn = document.getElementById('live-dock-submit-btn');
  if (btn) {
    btn.disabled = generating;
    btn.innerHTML = generating
      ? '<span class="inline-block animate-spin mr-2">⚙</span>SYNTHESIZING...'
      : '<span>⚡</span><span>GENERATE APP</span>';
  }
  if (liveBtn) {
    liveBtn.disabled = generating;
    liveBtn.innerText = generating ? 'UPDATING...' : 'UPDATE ↵';
  }
}

function copyPlaygroundHtml() {
  if (!currentHtml) return;
  navigator.clipboard.writeText(currentHtml).then(() => {
    const btn = document.getElementById('copy-html-btn');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<span>✓</span><span>COPIED!</span>';
      btn.classList.add('bg-[#FFB800]');
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.classList.remove('bg-[#FFB800]');
      }, 2000);
    }
  });
}

function exportPlaygroundHtml() {
  if (!currentHtml) return;
  const blob = new Blob([currentHtml], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tungsten-app-${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// Global Keyboard Shortcut: '/' to focus live dock prompt
window.addEventListener('keydown', (e) => {
  if (e.key === '/' && currentView === 'playground') {
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag !== 'input' && activeTag !== 'textarea') {
      e.preventDefault();
      setLiveDockState('expanded');
    }
  }
});

// ============================================================
// 6. INITIALIZATION & BOOTSTRAP
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  initBlueprints();
  initSplitterDrag();

  // Load saved ratio
  try {
    const saved = localStorage.getItem('tungsten_playground_ratio');
    if (saved) setPaneRatio(parseInt(saved, 10));
  } catch (_) {}

  // Render initial chat & playground
  renderChatUI();
  renderIframe(currentHtml);

  // Mount route
  initInitialRoute();
});
