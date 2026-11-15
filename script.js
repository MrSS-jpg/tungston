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
// 3.5. SUPABASE AUTHENTICATION & ACCESS TIER ENGINE
// ============================================================
const SUPABASE_URL = 'https://vhubdozlyjqpvpqcacdv.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZodWJkb3pseWpxcHZwcWNhY2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTc2MzksImV4cCI6MjEwNzAzMzYzOX0.SJCXi2CLCcyz7NtOl9IVmJBbHVxKoGHa9jES4rThUFM';

let supabaseClient = null;
let currentAuthSession = null;
let currentAuthUser = null;
let authModalTab = 'signin'; // 'signin' | 'signup'

function initSupabaseAuth() {
  try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Restore active session
      supabaseClient.auth.getSession().then(({ data, error }) => {
        if (!error && data && data.session) {
          currentAuthSession = data.session;
          currentAuthUser = data.session.user;
        } else {
          currentAuthSession = null;
          currentAuthUser = null;
        }
        updateAuthUI();
      }).catch((err) => {
        console.warn('Supabase getSession fallback:', err);
        currentAuthSession = null;
        currentAuthUser = null;
        updateAuthUI();
      });

      // Listen for session changes
      supabaseClient.auth.onAuthStateChange((event, session) => {
        currentAuthSession = session;
        currentAuthUser = session ? session.user : null;
        updateAuthUI();
        if (event === 'SIGNED_IN') {
          showToast(`Welcome back, ${session.user.email}!`, 'success');
          closeAuthModal();
        } else if (event === 'SIGNED_OUT') {
          showToast('Signed out. Free Test Pass active.', 'info');
          closeAuthModal();
        }
      });
    } else {
      console.warn('Supabase CDN not available. Free Test Pass active.');
      updateAuthUI();
    }
  } catch (err) {
    console.warn('Supabase initialization error (falling back to Free Test Pass):', err);
    updateAuthUI();
  }
}

function updateAuthUI() {
  const dotEl = document.getElementById('auth-status-dot');
  const textEl = document.getElementById('auth-status-text');
  const loggedInView = document.getElementById('auth-modal-logged-in');
  const loggedOutView = document.getElementById('auth-modal-logged-out');
  const userEmailDisplay = document.getElementById('auth-user-email-display');

  if (currentAuthUser && currentAuthUser.email) {
    if (dotEl) dotEl.className = 'auth-dot member';
    if (textEl) {
      const prefix = currentAuthUser.email.split('@')[0];
      textEl.textContent = `MEMBER [${prefix.slice(0, 8)}]`;
    }
    if (loggedInView) loggedInView.style.display = 'block';
    if (loggedOutView) loggedOutView.style.display = 'none';
    if (userEmailDisplay) userEmailDisplay.textContent = currentAuthUser.email;
  } else {
    if (dotEl) dotEl.className = 'auth-dot guest';
    if (textEl) textEl.textContent = 'GUEST PASS';
    if (loggedInView) loggedInView.style.display = 'none';
    if (loggedOutView) loggedOutView.style.display = 'block';
  }
}

function openAuthModal() {
  playMechanicalClick(600);
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.add('open');
    updateAuthUI();
    clearAuthError();
  }
}

function closeAuthModal() {
  playMechanicalClick(500);
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('open');
}

function setAuthModalTab(tab) {
  playMechanicalClick(700);
  authModalTab = tab;
  clearAuthError();
  const btnSignin = document.getElementById('tab-btn-signin');
  const btnSignup = document.getElementById('tab-btn-signup');
  const submitLabel = document.getElementById('auth-submit-label');

  if (tab === 'signin') {
    if (btnSignin) {
      btnSignin.className = 'flex-1 py-1.5 text-xs font-black uppercase transition-colors bg-[#FFB800] text-[#111111]';
    }
    if (btnSignup) {
      btnSignup.className = 'flex-1 py-1.5 text-xs font-black uppercase transition-colors text-[#6B6B63] hover:text-[#111111]';
    }
    if (submitLabel) submitLabel.textContent = 'SIGN IN TO FOUNDRY';
  } else {
    if (btnSignin) {
      btnSignin.className = 'flex-1 py-1.5 text-xs font-black uppercase transition-colors text-[#6B6B63] hover:text-[#111111]';
    }
    if (btnSignup) {
      btnSignup.className = 'flex-1 py-1.5 text-xs font-black uppercase transition-colors bg-[#FFB800] text-[#111111]';
    }
    if (submitLabel) submitLabel.textContent = 'CREATE MEMBER ACCOUNT';
  }
}

function showAuthError(msg) {
  const errBox = document.getElementById('auth-error-msg');
  if (errBox) {
    errBox.textContent = `[AUTH ERROR]: ${msg}`;
    errBox.style.display = 'block';
  }
}

function clearAuthError() {
  const errBox = document.getElementById('auth-error-msg');
  if (errBox) {
    errBox.textContent = '';
    errBox.style.display = 'none';
  }
}

async function handleAuthSubmit(e) {
  if (e) e.preventDefault();
  clearAuthError();

  const emailEl = document.getElementById('auth-email');
  const passEl = document.getElementById('auth-password');
  const submitBtn = document.getElementById('auth-submit-btn');

  if (!emailEl || !passEl) return;
  const email = emailEl.value.trim();
  const password = passEl.value;

  if (!email || !password) {
    showAuthError('Email and password are required.');
    return;
  }

  if (!supabaseClient) {
    showAuthError('Supabase connection unavailable. Click "CONTINUE AS GUEST" to test immediately.');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
  }

  try {
    if (authModalTab === 'signin') {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentAuthSession = data.session;
      currentAuthUser = data.user;
      updateAuthUI();
      closeAuthModal();
      showToast(`Welcome back, ${email}`, 'success');
      playMechanicalClick(880);
    } else {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        currentAuthSession = data.session;
        currentAuthUser = data.user;
        updateAuthUI();
        closeAuthModal();
        showToast('Account created & logged in!', 'success');
      } else {
        showToast('Registration submitted! Sign-in or continue as Guest.', 'info');
        setAuthModalTab('signin');
      }
      playMechanicalClick(880);
    }
  } catch (err) {
    console.error('Auth error:', err);
    showAuthError(err.message || 'Authentication failed. Please verify credentials or continue as Guest.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
    }
  }
}

async function handleSignOut() {
  playMechanicalClick(450);
  if (supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
    } catch (_) {}
  }
  currentAuthSession = null;
  currentAuthUser = null;
  updateAuthUI();
  closeAuthModal();
  showToast('Signed out. Active Free Test Pass enabled.', 'info');
}

function activateGuestPass() {
  playMechanicalClick(650);
  currentAuthSession = null;
  currentAuthUser = null;
  updateAuthUI();
  closeAuthModal();
  showToast('Free Test Pass Active. Direct access to all tools enabled.', 'success');
}

// Close modals when clicking backdrop
window.addEventListener('click', (e) => {
  const authModal = document.getElementById('auth-modal');
  if (authModal && e.target === authModal) {
    closeAuthModal();
  }
  const byokModal = document.getElementById('byok-modal');
  if (byokModal && e.target === byokModal) {
    closeByokModal();
  }
  const imageModal = document.getElementById('image-modal');
  if (imageModal && e.target === imageModal) {
    closeImageModal();
  }
  const projModal = document.getElementById('projects-modal');
  if (projModal && e.target === projModal) {
    closeProjectsModal();
  }
});

// ============================================================
// 4. TUNGSTON AI — EXPANDED FLAGSHIP ENGINE
// Multi-threaded sessions, Project Knowledge Ingestion, Context Gauge, BYOK, & Image Generation
// ============================================================
const CHAT_API_ENDPOINT = 'https://tungston-ai.vercel.app/api/chat';
const IMAGE_API_ENDPOINT = 'https://tungston-ai.vercel.app/api/image';

const CONVERSATIONS_KEY = 'tungsten_ai_conversations_v2';
const PROJECTS_KEY = 'tungston:projects';
const ACTIVE_PROJ_KEY = 'tungston:active_project';
const BYOK_KEY = 'tungsten_byok_key';
const BYOK_PROVIDER_KEY = 'tungsten_byok_provider';

let conversations = [];
let activeConversationId = null;
let isChatStreaming = false;
let chatAbortController = null;
let currentChatModel = 'qwen-2.5-72b';

// Projects State
let projects = [];
let activeProjectId = null;

// Initialize State from localStorage
try {
  const savedConvos = localStorage.getItem(CONVERSATIONS_KEY);
  if (savedConvos) conversations = JSON.parse(savedConvos);
} catch (e) { conversations = []; }

try {
  const savedProjects = localStorage.getItem(PROJECTS_KEY);
  if (savedProjects) projects = JSON.parse(savedProjects);
  activeProjectId = localStorage.getItem(ACTIVE_PROJ_KEY) || null;
} catch (e) { projects = []; activeProjectId = null; }

if (conversations.length === 0) {
  const initialId = 'convo-' + Date.now();
  conversations.push({
    id: initialId,
    title: 'Initial Session',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: []
  });
  activeConversationId = initialId;
} else {
  activeConversationId = conversations[0].id;
}

function getActiveConversation() {
  return conversations.find((c) => c.id === activeConversationId) || conversations[0];
}

function saveConversations() {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations.slice(0, 30)));
  } catch (_) {}
  renderThreadsList();
  updateSidebarBadge();
}

function saveProjects() {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    if (activeProjectId) localStorage.setItem(ACTIVE_PROJ_KEY, activeProjectId);
    else localStorage.removeItem(ACTIVE_PROJ_KEY);
  } catch (_) {}
  updateActiveProjectBadge();
  renderProjectsModal();
  updateContextGauge();
}

// Model Switching
function setChatModel(modelKey) {
  currentChatModel = modelKey;
  document.querySelectorAll('.model-opt').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.model === modelKey);
  });
  playMechanicalClick(650);
  showToast(`Active Model: ${modelKey.toUpperCase()}`);
}

// Sidebar Toggle
function toggleChatSidebar() {
  const sidebar = document.getElementById('chat-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;

  playMechanicalClick(520);
  if (window.innerWidth < 768) {
    sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('active', sidebar.classList.contains('open'));
  } else {
    sidebar.classList.toggle('closed');
  }
}

function updateSidebarBadge() {
  const badge = document.getElementById('sidebar-thread-badge');
  if (badge) badge.innerText = conversations.length;
}

function renderThreadsList(filterQuery = '') {
  const container = document.getElementById('chat-threads-container');
  if (!container) return;

  const q = filterQuery.toLowerCase().trim();
  const list = q ? conversations.filter((c) => c.title.toLowerCase().includes(q)) : conversations;

  container.innerHTML = '';
  if (list.length === 0) {
    container.innerHTML = '<div class="text-[10px] text-[#6B6B63] italic p-3 text-center">No matching sessions.</div>';
    return;
  }

  list.forEach((convo) => {
    const item = document.createElement('div');
    const isActive = convo.id === activeConversationId;
    item.className = `thread-item ${isActive ? 'active' : ''}`;
    item.onclick = () => switchConversation(convo.id);

    item.innerHTML = `
      <span class="thread-title font-mono">${escapeHtml(convo.title || 'Untitled Session')}</span>
      <button
        type="button"
        class="thread-del-btn"
        title="Delete session"
        onclick="event.stopPropagation(); deleteConversation('${convo.id}')"
      >
        ×
      </button>
    `;
    container.appendChild(item);
  });
}

function filterChatThreads(q) {
  renderThreadsList(q);
}

function switchConversation(id) {
  if (activeConversationId === id) return;
  activeConversationId = id;
  playMechanicalClick(580);
  renderThreadsList();
  renderChatUI();
  updateContextGauge();

  // Close mobile sidebar on select
  if (window.innerWidth < 768) {
    const sidebar = document.getElementById('chat-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  }
}

function newChat() {
  if (isChatStreaming) stopChatGeneration();

  const newId = 'convo-' + Date.now();
  const newConvo = {
    id: newId,
    title: 'New Session ' + (conversations.length + 1),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: []
  };

  conversations.unshift(newConvo);
  activeConversationId = newId;
  saveConversations();
  renderChatUI();
  updateContextGauge();
  playMechanicalClick(440);
  showToast('New chat session started');

  if (window.innerWidth < 768) {
    const sidebar = document.getElementById('chat-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  }

  const input = document.getElementById('chat-input');
  if (input) input.focus();
}

function deleteConversation(id) {
  if (conversations.length <= 1) {
    // Reset to one blank session
    conversations[0].messages = [];
    conversations[0].title = 'Initial Session';
    saveConversations();
    renderChatUI();
    updateContextGauge();
    return;
  }

  conversations = conversations.filter((c) => c.id !== id);
  if (activeConversationId === id) {
    activeConversationId = conversations[0].id;
  }
  saveConversations();
  renderChatUI();
  updateContextGauge();
  playMechanicalClick(300);
}

function clearAllChats() {
  if (!confirm('Are you sure you want to clear all chat sessions?')) return;
  conversations = [{
    id: 'convo-' + Date.now(),
    title: 'Initial Session',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: []
  }];
  activeConversationId = conversations[0].id;
  saveConversations();
  renderChatUI();
  updateContextGauge();
  showToast('All chat sessions cleared');
}

function exportAllChats() {
  let md = '# TUNGSTON AI — COMPLETE ARCHIVE EXPORT\n\n';
  md += `Exported: ${new Date().toISOString()}\nTotal Sessions: ${conversations.length}\n\n---\n\n`;

  conversations.forEach((c) => {
    md += `## SESSION: ${c.title} (${new Date(c.createdAt).toLocaleString()})\n\n`;
    c.messages.forEach((m) => {
      md += `### ${m.role === 'user' ? 'USER' : 'TUNGSTON AI'}\n\n${m.content}\n\n`;
    });
    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tungsten-archive-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// Render Messages for Active Conversation
function renderChatUI() {
  const welcomeHero = document.getElementById('chat-welcome');
  const messageList = document.getElementById('chat-message-list');
  if (!messageList) return;

  const convo = getActiveConversation();
  const msgs = convo.messages || [];

  if (msgs.length === 0) {
    if (welcomeHero) welcomeHero.style.display = 'block';
    messageList.innerHTML = '';
    return;
  }

  if (welcomeHero) welcomeHero.style.display = 'none';
  messageList.innerHTML = '';

  msgs.forEach((msg, idx) => {
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
    } else if (msg.isImage) {
      row.innerHTML = `
        <div class="msg-bubble-assistant">
          <div class="msg-header">
            <span class="msg-tag-assistant"><span class="dot"></span>W-74 // EDGE IMAGE SYNTHESIS</span>
            <span>FLUX / SDXL</span>
          </div>
          <div class="msg-body">
            <div class="image-result-card">
              <img src="${msg.imageUrl}" alt="${escapeHtml(msg.prompt || 'Generated Image')}" class="image-result-img" onclick="openImageLightbox('${msg.imageUrl}')" />
              <div class="image-result-meta">
                <span class="truncate mr-2 font-mono">${escapeHtml(msg.prompt || 'Visual Render')}</span>
                <a href="${msg.imageUrl}" download="tungsten-render-${Date.now()}.png" target="_blank" class="border border-[#FFB800] px-2 py-0.5 text-[#111] bg-[#FFB800] text-[10px] font-black">⬇ SAVE</a>
              </div>
            </div>
          </div>
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

// Live Context Gauge Calculation
function updateContextGauge() {
  const convo = getActiveConversation();
  const msgs = convo.messages || [];

  let totalChars = 1200; // base system prompt
  msgs.forEach((m) => {
    totalChars += (m.content || '').length;
  });

  // Add active project files size if active
  const activeProj = projects.find((p) => p.id === activeProjectId);
  if (activeProj) {
    activeProj.files.forEach((f) => {
      totalChars += (f.content || '').length;
    });
  }

  const estimatedTokens = Math.round(totalChars / 3.8);
  const maxTokens = 128000;
  const pct = Math.min(100, Math.max(1, Math.round((estimatedTokens / maxTokens) * 100)));

  const fillEl = document.getElementById('context-gauge-fill');
  const labelEl = document.getElementById('context-gauge-label');

  if (fillEl) fillEl.style.width = pct + '%';
  if (labelEl) {
    const formattedTokens = estimatedTokens >= 1000 ? `${(estimatedTokens / 1000).toFixed(1)}K` : estimatedTokens;
    labelEl.innerText = `${formattedTokens} / 128K`;
  }
}

// Toast System
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  toast.innerText = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

function insertComposerText(snippet) {
  const input = document.getElementById('chat-input');
  if (!input) return;
  input.value = input.value ? `${input.value} ${snippet}` : snippet;
  input.focus();
  playMechanicalClick(600);
}

// ============================================================
// PROJECTS & KNOWLEDGE CONTEXT MANAGEMENT
// ============================================================
function openProjectsModal() {
  playMechanicalClick(600);
  const modal = document.getElementById('projects-modal');
  if (modal) modal.classList.add('open');
  renderProjectsModal();
}

function closeProjectsModal() {
  const modal = document.getElementById('projects-modal');
  if (modal) modal.classList.remove('open');
}

function updateActiveProjectBadge() {
  const label = document.getElementById('active-project-label');
  const activeProj = projects.find((p) => p.id === activeProjectId);

  if (label) {
    if (activeProj) {
      label.innerText = `CONTEXT: ${activeProj.name.toUpperCase().slice(0, 10)}`;
      label.classList.add('text-[#FFB800]');
    } else {
      label.innerText = 'PROJECTS';
      label.classList.remove('text-[#FFB800]');
    }
  }
}

function renderProjectsModal() {
  const countEl = document.getElementById('modal-proj-count');
  const activeNameEl = document.getElementById('modal-active-proj-name');
  const detachBtn = document.getElementById('btn-detach-project');
  const listContainer = document.getElementById('projects-list-container');

  if (countEl) countEl.innerText = projects.length;

  const activeProj = projects.find((p) => p.id === activeProjectId);
  if (activeNameEl) {
    activeNameEl.innerText = activeProj ? `${activeProj.name.toUpperCase()} (${activeProj.files.length} FILES)` : 'NONE (GENERAL MODE)';
  }
  if (detachBtn) {
    detachBtn.style.display = activeProj ? 'inline-block' : 'none';
  }

  if (!listContainer) return;
  if (projects.length === 0) {
    listContainer.innerHTML = '<div class="text-[11px] text-[#6B6B63] italic p-3 text-center border-2 border-dashed border-[#111111]">No projects created yet. Add one above.</div>';
    return;
  }

  listContainer.innerHTML = '';
  projects.forEach((proj) => {
    const isCurrentActive = proj.id === activeProjectId;
    const card = document.createElement('div');
    card.className = `border-2 border-[#111111] p-2.5 bg-[#EEEEE6] shadow-hard-sm space-y-2 ${isCurrentActive ? 'border-l-4 border-l-[#FFB800]' : ''}`;

    let filesHtml = '';
    if (proj.files.length === 0) {
      filesHtml = '<span class="text-[10px] text-[#6B6B63] italic">No files attached yet.</span>';
    } else {
      filesHtml = proj.files.map((f, fIdx) => `
        <div class="flex items-center justify-between bg-white border border-[#111111] px-2 py-1 text-[10px] font-mono">
          <span class="truncate mr-2 font-bold">${escapeHtml(f.name)} (${(f.sizeBytes / 1024).toFixed(1)} KB)</span>
          <button type="button" onclick="removeProjectFile('${proj.id}', ${fIdx})" class="text-[#FF3B30] font-bold hover:text-[#111]">✕</button>
        </div>
      `).join('');
    }

    card.innerHTML = `
      <div class="flex items-center justify-between border-b border-[#D8D8CF] pb-1">
        <div class="flex items-center gap-1.5">
          <span class="font-black text-xs text-[#111111]">${escapeHtml(proj.name)}</span>
          ${isCurrentActive ? '<span class="bg-[#111111] text-[#FFB800] text-[9px] font-bold px-1 py-0.2">ACTIVE</span>' : ''}
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            onclick="selectProject('${proj.id}')"
            class="text-[10px] border border-[#111111] px-2 py-0.5 font-bold ${isCurrentActive ? 'bg-[#FFB800] text-[#111]' : 'bg-white hover:bg-[#FFB800]'}"
          >
            ${isCurrentActive ? '✓ ENGAGED' : 'ENGAGE CONTEXT'}
          </button>
          <button
            type="button"
            onclick="deleteProject('${proj.id}')"
            class="text-[10px] border border-[#111111] bg-white text-[#FF3B30] px-1.5 py-0.5 font-bold hover:bg-[#FF3B30] hover:text-white"
          >
            🗑️
          </button>
        </div>
      </div>

      <div class="space-y-1">
        <div class="text-[10px] font-bold text-[#6B6B63] uppercase">Attached Knowledge Files:</div>
        <div class="space-y-1">${filesHtml}</div>
      </div>

      <div class="pt-1 flex gap-1">
        <input
          type="file"
          id="file-upload-${proj.id}"
          accept=".md,.txt"
          multiple
          class="hidden"
          onchange="handleProjectFileUpload('${proj.id}', this)"
        />
        <button
          type="button"
          onclick="document.getElementById('file-upload-${proj.id}').click()"
          class="text-[10px] border border-[#111111] bg-white px-2 py-0.5 font-bold hover:bg-[#FFB800] flex items-center gap-1"
        >
          <span>+ UPLOAD FILE (.md, .txt)</span>
        </button>
        <button
          type="button"
          onclick="promptAddProjectText('${proj.id}')"
          class="text-[10px] border border-[#111111] bg-white px-2 py-0.5 font-bold hover:bg-[#FFB800] flex items-center gap-1"
        >
          <span>+ PASTE TEXT</span>
        </button>
      </div>
    `;
    listContainer.appendChild(card);
  });
}

function createProject() {
  const inp = document.getElementById('new-project-name-input');
  if (!inp) return;
  const name = inp.value.trim();
  if (!name) return;

  const newProj = {
    id: 'proj-' + Date.now(),
    name: name,
    files: [],
    createdAt: Date.now()
  };

  projects.unshift(newProj);
  inp.value = '';
  saveProjects();
  showToast(`Project created: ${name}`);
  playMechanicalClick(650);
}

function deleteProject(id) {
  if (!confirm('Are you sure you want to delete this project?')) return;
  projects = projects.filter((p) => p.id !== id);
  if (activeProjectId === id) activeProjectId = null;
  saveProjects();
  showToast('Project deleted');
  playMechanicalClick(300);
}

function selectProject(id) {
  activeProjectId = id;
  saveProjects();
  const p = projects.find((proj) => proj.id === id);
  showToast(`Context engaged: ${p ? p.name : 'None'}`);
  playMechanicalClick(750);
}

function detachActiveProject() {
  activeProjectId = null;
  saveProjects();
  showToast('Project context detached');
  playMechanicalClick(400);
}

function handleProjectFileUpload(projId, inputEl) {
  const files = inputEl.files;
  if (!files || !files.length) return;

  const proj = projects.find((p) => p.id === projId);
  if (!proj) return;

  Array.from(files).forEach((file) => {
    if (file.size > 50 * 1024) {
      alert(`File "${file.name}" exceeds the 50KB safety limit.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      proj.files.push({
        name: file.name,
        content: e.target.result,
        sizeBytes: file.size
      });
      saveProjects();
      showToast(`Uploaded: ${file.name}`);
    };
    reader.readAsText(file);
  });
  inputEl.value = '';
}

function promptAddProjectText(projId) {
  const title = prompt('Enter document title (e.g. "Architecture Spec"):');
  if (!title) return;
  const content = prompt('Paste your document text/markdown content:');
  if (!content) return;

  const proj = projects.find((p) => p.id === projId);
  if (!proj) return;

  proj.files.push({
    name: title.endsWith('.md') ? title : `${title}.md`,
    content: content,
    sizeBytes: new TextEncoder().encode(content).length
  });
  saveProjects();
  showToast(`Attached snippet: ${title}`);
}

function removeProjectFile(projId, fileIdx) {
  const proj = projects.find((p) => p.id === projId);
  if (!proj) return;
  proj.files.splice(fileIdx, 1);
  saveProjects();
  showToast('File removed');
}

// ============================================================
// BRING YOUR OWN KEY (BYOK)
// ============================================================
function openByokModal() {
  playMechanicalClick(600);
  const modal = document.getElementById('byok-modal');
  const keyInput = document.getElementById('byok-key-input');
  const providerSelect = document.getElementById('byok-provider-select');

  const savedKey = localStorage.getItem(BYOK_KEY) || '';
  const savedProvider = localStorage.getItem(BYOK_PROVIDER_KEY) || 'groq';

  if (keyInput) keyInput.value = savedKey;
  if (providerSelect) providerSelect.value = savedProvider;
  if (modal) modal.classList.add('open');
}

function closeByokModal() {
  const modal = document.getElementById('byok-modal');
  if (modal) modal.classList.remove('open');
}

function saveByokKey() {
  const keyInput = document.getElementById('byok-key-input');
  const providerSelect = document.getElementById('byok-provider-select');
  const key = keyInput ? keyInput.value.trim() : '';
  const provider = providerSelect ? providerSelect.value : 'groq';

  if (!key) {
    clearByokKey();
    return;
  }

  localStorage.setItem(BYOK_KEY, key);
  localStorage.setItem(BYOK_PROVIDER_KEY, provider);
  closeByokModal();
  updateByokStatusBadge();
  showToast('BYOK API Key saved securely');
  playMechanicalClick(750);
}

function clearByokKey() {
  localStorage.removeItem(BYOK_KEY);
  localStorage.removeItem(BYOK_PROVIDER_KEY);
  closeByokModal();
  updateByokStatusBadge();
  showToast('BYOK Key removed. Reverted to Free Test Pass.');
  playMechanicalClick(400);
}

function updateByokStatusBadge() {
  const label = document.getElementById('byok-status-label');
  const meta = document.getElementById('composer-status-meta');
  const savedKey = localStorage.getItem(BYOK_KEY);

  if (label) {
    if (savedKey) {
      label.innerText = 'BYOK: ON ✓';
      label.classList.add('text-[#FFB800]');
    } else {
      label.innerText = 'BYOK';
      label.classList.remove('text-[#FFB800]');
    }
  }

  if (meta) {
    if (savedKey) {
      meta.innerText = 'PERSONAL BYOK KEY ACTIVE • UNLIMITED CAPACITY';
    } else {
      meta.innerText = 'GROQ LPU CLUSTER • 4-KEY AUTO-ROTATING POOL • FREE TEST PASS';
    }
  }
}

// ============================================================
// IMAGE GENERATION (EDGE SYNTHESIS)
// ============================================================
function openImageModal() {
  playMechanicalClick(600);
  const modal = document.getElementById('image-modal');
  if (modal) modal.classList.add('open');
  const input = document.getElementById('image-prompt-input');
  if (input) input.focus();
}

function closeImageModal() {
  const modal = document.getElementById('image-modal');
  if (modal) modal.classList.remove('open');
}

async function handleImageModalSubmit() {
  const input = document.getElementById('image-prompt-input');
  const resultBox = document.getElementById('image-modal-result');
  const btn = document.getElementById('btn-generate-image-modal');
  const prompt = input ? input.value.trim() : '';

  if (!prompt) {
    alert('Please enter an image prompt description.');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="inline-block animate-spin mr-2">⚙</span>SYNTHESIZING PIXELS...';
  }
  if (resultBox) {
    resultBox.innerHTML = '<div class="text-center font-mono py-6"><span class="inline-block animate-spin mr-2 text-[#FFB800]">⚙</span>RENDERING VIA EDGE IMAGE MODEL...</div>';
  }

  try {
    const res = await fetch(IMAGE_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Image error (${res.status})`);
    }

    const data = await res.json();
    const imgUrl = (data.images && data.images[0]) || '';
    if (!imgUrl) throw new Error('No image returned from engine.');

    if (resultBox) {
      resultBox.innerHTML = `
        <div class="space-y-2 w-full">
          <img src="${imgUrl}" alt="${escapeHtml(prompt)}" class="max-h-[300px] mx-auto border-2 border-[#111111]" />
          <div class="flex justify-between items-center text-xs pt-1">
            <span class="truncate max-w-[280px] font-mono">${escapeHtml(prompt)}</span>
            <a href="${imgUrl}" download="tungsten-render-${Date.now()}.png" target="_blank" class="border-2 border-[#FFB800] bg-[#FFB800] text-[#111] px-2.5 py-1 text-[10px] font-black uppercase">⬇ DOWNLOAD</a>
          </div>
        </div>
      `;
    }

    // Also add to active conversation as an image message
    const convo = getActiveConversation();
    convo.messages.push({
      role: 'user',
      content: `/image ${prompt}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    convo.messages.push({
      role: 'assistant',
      isImage: true,
      imageUrl: imgUrl,
      prompt: prompt,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    saveConversations();
    renderChatUI();
    showToast('Image rendered successfully');
  } catch (err) {
    if (resultBox) {
      resultBox.innerHTML = `<div class="text-[#FF3B30] font-mono p-4">Error: ${escapeHtml(err.message || String(err))}</div>`;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>🎨</span><span>GENERATE IMAGE</span>';
    }
  }
}

// Lightbox for full-size viewing
function openImageLightbox(url) {
  const win = window.open(url, '_blank');
  if (win) win.focus();
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

  // 1. Check for /image command
  if (prompt.startsWith('/image')) {
    const imgPrompt = prompt.replace(/^\/image\s*/, '').trim();
    if (!imgPrompt) {
      alert('Please provide an image prompt after /image (e.g. /image glowing reactor core)');
      return;
    }
    const imgInput = document.getElementById('image-prompt-input');
    if (imgInput) imgInput.value = imgPrompt;
    openImageModal();
    handleImageModalSubmit();
    return;
  }

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const convo = getActiveConversation();

  // If this is the first message in the session, update thread title
  if (convo.messages.length === 0) {
    convo.title = prompt.slice(0, 32) + (prompt.length > 32 ? '...' : '');
  }

  // Add user message
  convo.messages.push({
    role: 'user',
    content: prompt,
    time: timeStr
  });

  // Add assistant placeholder
  const assistantIdx = convo.messages.length;
  convo.messages.push({
    role: 'assistant',
    content: '',
    model: currentChatModel.toUpperCase(),
    time: timeStr
  });

  renderChatUI();
  updateContextGauge();
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
    // Check for Active Project Knowledge Context
    let projectContext = null;
    const activeProj = projects.find((p) => p.id === activeProjectId);
    if (activeProj && activeProj.files && activeProj.files.length > 0) {
      projectContext = `=== ATTACHED PROJECT KNOWLEDGE: [${activeProj.name}] ===\n`;
      activeProj.files.forEach((f) => {
        projectContext += `\n--- FILE: ${f.name} ---\n${f.content}\n`;
      });
      projectContext += `\n=========================================\nTreat the above project documentation and files as persistent ground truth for this project.`;
    }

    const payload = {
      messages: convo.messages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content
      })),
      modelOverride: currentChatModel,
      projectContext: projectContext
    };

    // Prepare Request Headers (including Auth & BYOK if set)
    const headers = {
      'Content-Type': 'application/json'
    };
    if (currentAuthSession && currentAuthSession.access_token) {
      headers['Authorization'] = `Bearer ${currentAuthSession.access_token}`;
    }
    const byokKey = localStorage.getItem(BYOK_KEY);
    const byokProvider = localStorage.getItem(BYOK_PROVIDER_KEY) || 'groq';
    if (byokKey) {
      headers['x-byok-key'] = byokKey;
      headers['x-byok-provider'] = byokProvider;
    }

    const res = await fetch(CHAT_API_ENDPOINT, {
      method: 'POST',
      headers: headers,
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
      convo.messages[assistantIdx].content = accumulatedResponse;

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

    convo.updatedAt = Date.now();
    saveConversations();
    updateContextGauge();
  } catch (err) {
    if (err.name === 'AbortError') {
      accumulatedResponse += '\n\n*[Generation stopped by user]*';
    } else {
      accumulatedResponse += `\n\n**[TRANSMISSION ERROR]**: ${err.message || String(err)}`;
    }
    convo.messages[assistantIdx].content = accumulatedResponse;
    if (assistantBody) {
      assistantBody.innerHTML = renderMarkdown(accumulatedResponse);
      decorateCodeBlocks(assistantBody);
    }
    saveConversations();
    updateContextGauge();
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

function exportChat() {
  const convo = getActiveConversation();
  const msgs = convo.messages || [];
  if (msgs.length === 0) {
    alert('No messages in this session to export.');
    return;
  }
  let md = `# TUNGSTON AI — SESSION: ${convo.title}\n\n`;
  md += `Exported: ${new Date().toISOString()}\nModel: ${currentChatModel}\n\n---\n\n`;
  msgs.forEach((m) => {
    md += `### ${m.role === 'user' ? 'USER' : 'TUNGSTON AI (' + (m.model || 'GROQ') + ')'}\n\n`;
    md += `${m.content}\n\n---\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tungsten-chat-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Session exported to Markdown');
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

    const headers = {
      'Content-Type': 'application/json'
    };
    if (currentAuthSession && currentAuthSession.access_token) {
      headers['Authorization'] = `Bearer ${currentAuthSession.access_token}`;
    }

    const res = await fetch(PLAYGROUND_API, {
      method: 'POST',
      headers: headers,
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
  initSupabaseAuth();
  initBlueprints();
  initSplitterDrag();

  // Load saved ratio
  try {
    const saved = localStorage.getItem('tungsten_playground_ratio');
    if (saved) setPaneRatio(parseInt(saved, 10));
  } catch (_) {}

  // Render initial chat, threads & playground
  renderThreadsList();
  updateSidebarBadge();
  updateActiveProjectBadge();
  updateByokStatusBadge();
  updateContextGauge();

  renderChatUI();
  renderIframe(currentHtml);

  // Mount route
  initInitialRoute();
});
