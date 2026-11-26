/* StudyHub v2 — auth, Notion checkboxes, real AI pipeline */
const KEYS = {
  session: 'studyhub_session_v2',
  tasks: 'studyhub_tasks_v2',
  cards: 'studyhub_cards_v2',
  history: 'studyhub_history_v2',
  theme: 'studyhub_theme_v2'
};

const DEFAULT_USER = {
  name: 'Benjamin Yu',
  email: 'benjaminyu747@gmail.com',
  avatar: 'https://avatars.githubusercontent.com/u/213555010?v=4'
};

const SEED = [
  { id: 's1', title: 'Vokabeln 4.3 ins Heft schreiben', type: 'hw', status: 'Not started', due: '2026-11-27', done: false },
  { id: 's2', title: 'Buch S. 31 Nr. 1', type: 'hw', status: 'To Do', due: '2026-11-27', done: false },
  { id: 's3', title: 'Math Test 2', type: 'test', status: 'Not started', due: '2026-11-30', done: false },
  { id: 's4', title: 'Revise math test-geometry', type: 'revise', status: 'Not started', due: '2026-11-30', done: false },
  { id: 's5', title: 'Vokabeln Test 4.3', type: 'test', status: 'Not started', due: '2026-11-30', done: false },
  { id: 's6', title: 'Üben für den Vokabeln Test 4.3', type: 'revise', status: 'To Do', due: '2026-11-30', done: false },
  { id: 's7', title: 'Write the Liedtexte for Dumb ways to die', type: 'hw', status: 'Not started', due: '2026-11-30', done: false },
  { id: 's8', title: 'Vokabeln Test-Wiedergabe', type: 'test', status: 'Not started', due: '2026-12-01', done: false },
  { id: 's9', title: '工作紙做完', type: 'hw', status: 'In progress', due: '2026-12-01', done: false },
  { id: 's10', title: 'Geography Test', type: 'test', status: 'Not started', due: '2026-12-02', done: false },
  { id: 's11', title: 'Intensivtrainer fertig machen', type: 'hw', status: 'To Do', due: '2026-12-03', done: false },
  { id: 's12', title: 'Üben für Lektionstest-Kapitel 4', type: 'revise', status: 'To Do', due: '2026-12-07', done: false },
  { id: 's13', title: 'Lektionstest-Kapitel 4', type: 'test', status: 'Not started', due: '2026-12-07', done: false }
];

let tasks = JSON.parse(localStorage.getItem(KEYS.tasks) || 'null') || SEED.map(t => ({ ...t }));
let cards = JSON.parse(localStorage.getItem(KEYS.cards) || '[]');
let history = JSON.parse(localStorage.getItem(KEYS.history) || '[]');
let session = JSON.parse(localStorage.getItem(KEYS.session) || 'null');
let calDate = new Date();
let selectedDay = iso(new Date());
let aiMode = 'sheet';
let attachments = [];
let studyQueue = [];
let studyIndex = 0;

function iso(d) { return d.toISOString().slice(0, 10); }
function saveTasks() { localStorage.setItem(KEYS.tasks, JSON.stringify(tasks)); }
function saveCards() { localStorage.setItem(KEYS.cards, JSON.stringify(cards)); updateDeckUI(); }
function saveHistory() { localStorage.setItem(KEYS.history, JSON.stringify(history)); }
function saveSession() { localStorage.setItem(KEYS.session, JSON.stringify(session)); }

function classify(title) {
  const t = (title || '').toLowerCase();
  if (/üben|uben|revise|revision/.test(t)) return 'revise';
  if (/test|exam|klausur|lektionstest|vokabeln test/.test(t)) return 'test';
  return 'hw';
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showAuth(which) {
  ['login','signup','forgot'].forEach(id => {
    document.getElementById('auth-' + id).classList.toggle('hidden', id !== which);
  });
  document.getElementById('auth-error')?.classList.add('hidden');
}

function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err = document.getElementById('auth-error');
  if (!email.includes('@')) {
    err.textContent = 'Enter a valid email.';
    err.classList.remove('hidden');
    return;
  }
  const users = JSON.parse(localStorage.getItem('studyhub_users') || '{}');
  if (users[email] && users[email].pass && pass.length > 0 && pass !== users[email].pass) {
    err.textContent = 'Wrong password.';
    err.classList.remove('hidden');
    return;
  }
  session = {
    email,
    name: users[email]?.name || (email === DEFAULT_USER.email ? DEFAULT_USER.name : email.split('@')[0]),
    avatar: DEFAULT_USER.avatar,
    loginAt: Date.now()
  };
  saveSession();
  enterApp();
}

function doGoogleLogin() {
  session = { ...DEFAULT_USER, loginAt: Date.now(), provider: 'google' };
  saveSession();
  enterApp();
}

function doSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  if (!email.includes('@') || pass.length < 6) {
    alert('Valid email + password min 6 characters.');
    return;
  }
  const users = JSON.parse(localStorage.getItem('studyhub_users') || '{}');
  users[email] = { name: name || email.split('@')[0], pass };
  localStorage.setItem('studyhub_users', JSON.stringify(users));
  session = { email, name: users[email].name, avatar: DEFAULT_USER.avatar, loginAt: Date.now() };
  saveSession();
  enterApp();
}

function doForgot() {
  const email = document.getElementById('forgot-email').value.trim();
  const msg = document.getElementById('forgot-msg');
  msg.textContent = email ? `Demo: reset link would be sent to ${email}` : 'Enter an email.';
  msg.classList.remove('hidden');
}

function doLogout() {
  session = null;
  localStorage.removeItem(KEYS.session);
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  showAuth('login');
}

function enterApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('user-name').textContent = session.name;
  document.getElementById('user-email').textContent = session.email;
  document.getElementById('user-avatar').src = session.avatar || DEFAULT_USER.avatar;
  document.getElementById('settings-name').textContent = session.name;
  document.getElementById('settings-email').textContent = session.email;
  document.getElementById('today-label').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  bootstrapChat();
  renderTasks();
  renderCalendar();
  updateDeckUI();
  renderHistory();
  syncNotion();
}

function toggleTheme() {
  const html = document.documentElement;
  const light = html.classList.toggle('light');
  html.classList.toggle('dark', !light);
  localStorage.setItem(KEYS.theme, light ? 'light' : 'dark');
  document.getElementById('theme-icon').className = light ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function applyTheme() {
  const t = localStorage.getItem(KEYS.theme) || 'dark';
  const light = t === 'light';
  document.documentElement.classList.toggle('light', light);
  document.documentElement.classList.toggle('dark', !light);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.className = light ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function showView(name) {
  document.querySelectorAll('section[id^="view-"]').forEach(s => s.classList.add('hidden'));
  document.getElementById('view-' + name)?.classList.remove('hidden');
  document.querySelectorAll('.sidebar-link').forEach(a => a.classList.toggle('active', a.dataset.view === name));
  const titles = { home:'Home', calendar:'Calendar', tasks:'Tasks', flashcards:'Flashcards', revision:'Revision', plan:'Plan My Day', settings:'Settings' };
  document.getElementById('view-title').textContent = titles[name] || name;
  if (name === 'calendar') renderCalendar();
  if (name === 'tasks') renderTasks();
  if (name === 'flashcards') updateDeckUI();
  if (name === 'revision') renderHistory();
}

function renderTasks() {
  const box = document.getElementById('tasks-list');
  if (!box) return;
  const sorted = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.due || '9999').localeCompare(b.due || '9999');
  });
  if (!sorted.length) {
    box.innerHTML = '<p class="text-gray-500 text-sm">No tasks. Sync Notion or load demo.</p>';
    return;
  }
  box.innerHTML = sorted.map(t => {
    const kind = t.type || classify(t.title);
    const badge = kind === 'test' ? 'bg-rose-900/50 text-rose-300' : kind === 'revise' ? 'bg-amber-900/50 text-amber-300' : 'bg-indigo-900/50 text-indigo-300';
    return `<label class="task-row flex items-center gap-3 p-2.5 rounded-lg cursor-pointer">
      <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTaskDone('${t.id}', this.checked)" class="w-4 h-4 rounded accent-purple-500" />
      <div class="flex-1 min-w-0">
        <div class="text-sm ${t.done ? 'line-through text-gray-500' : 'text-gray-100'}">${escapeHtml(t.title)}</div>
        <div class="text-[10px] text-gray-500">Due ${t.due || '—'} · ${escapeHtml(t.status || '')}</div>
      </div>
      <span class="text-[10px] px-2 py-0.5 rounded ${badge}">${kind}</span>
    </label>`;
  }).join('');
}

async function toggleTaskDone(id, done) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.done = done;
  t.status = done ? 'Done' : 'Not started';
  saveTasks();
  renderTasks();
  renderCalendar();
  if (String(id).startsWith('s')) return;
  try {
    const res = await fetch('/.netlify/functions/notion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: done ? 'mark_done' : 'mark_undone', pageId: id })
    });
    const data = await res.json();
    if (data.ok) setSyncUI(true, 'Notion updated');
    else if (data.error) setSyncUI(false, data.error);
  } catch {
    setSyncUI(false, 'Notion update offline — saved locally');
  }
}

function setSyncUI(ok, label) {
  const dot = document.getElementById('sync-dot');
  const lab = document.getElementById('sync-label');
  if (dot) dot.className = 'w-2 h-2 rounded-full ' + (ok ? 'bg-emerald-400' : 'bg-amber-500');
  if (lab) lab.textContent = label;
  const st = document.getElementById('settings-sync-status');
  if (st) st.textContent = label;
}

async function syncNotion() {
  setSyncUI(false, 'Syncing…');
  try {
    const res = await fetch('/.netlify/functions/notion');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.error && (!data.tasks || !data.tasks.length)) {
      setSyncUI(false, data.error || 'No Notion token');
      return;
    }
    if (Array.isArray(data.tasks) && data.tasks.length) {
      tasks = data.tasks.map(t => ({
        id: t.id,
        title: t.title,
        type: mapType(t.taskType || t.title),
        status: t.status,
        due: t.due,
        done: !!t.done || t.status === 'Done',
        priority: t.priority
      }));
      saveTasks();
      setSyncUI(true, `Synced ${tasks.length} tasks`);
      renderTasks();
      renderCalendar();
      return;
    }
  } catch (e) {
    setSyncUI(false, 'Local mode (deploy + NOTION_TOKEN for live sync)');
  }
}

function mapType(raw) {
  const s = String(raw || '').toLowerCase();
  if (/exam|test|🚩/.test(s)) return 'test';
  if (/revision|üben|📑/.test(s)) return 'revise';
  return classify(String(raw));
}

function loadSeedTasks() {
  tasks = SEED.map(t => ({ ...t }));
  saveTasks();
  renderTasks();
  renderCalendar();
  setSyncUI(false, 'Demo tasks loaded');
}

function changeMonth(d) { calDate.setMonth(calDate.getMonth() + d); renderCalendar(); }
function goToday() { calDate = new Date(); selectedDay = iso(new Date()); renderCalendar(); }

function renderCalendar() {
  const wrap = document.getElementById('cal-wrap');
  if (!wrap) return;
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  document.getElementById('cal-title').textContent = calDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const startPad = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = iso(new Date());
  let html = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d =>
    `<div class="bg-surface py-2 text-center text-xs font-semibold text-purple-400">${d}</div>`
  ).join('');
  for (let i = 0; i < startPad; i++) html += `<div class="bg-void/40 min-h-[88px]"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayTasks = tasks.filter(t => t.due === date && !t.done);
    const ring = date === selectedDay ? 'ring-1 ring-purple-500' : date === today ? 'ring-1 ring-indigo-400' : '';
    html += `<div class="bg-panel min-h-[88px] p-1.5 cursor-pointer hover:bg-purple-900/20 ${ring}" onclick="selectDay('${date}')">
      <div class="text-[11px] ${date===today?'text-indigo-300':'text-gray-400'} mb-1">${d}</div>
      ${dayTasks.slice(0,3).map(t => {
        const k = t.type || classify(t.title);
        const c = k==='test'?'bg-rose-500':k==='revise'?'bg-amber-400':'bg-indigo-400';
        return `<div class="text-[9px] truncate px-1 py-0.5 rounded mb-0.5 bg-black/30 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full ${c}"></span>${escapeHtml(t.title)}</div>`;
      }).join('')}
      ${dayTasks.length>3?`<div class="text-[9px] text-purple-400">+${dayTasks.length-3}</div>`:''}
    </div>`;
  }
  wrap.innerHTML = html;
  showDayDetail(selectedDay);
}

function selectDay(date) { selectedDay = date; renderCalendar(); }

function showDayDetail(date) {
  const box = document.getElementById('day-detail');
  if (!box) return;
  const list = tasks.filter(t => t.due === date);
  if (!list.length) { box.innerHTML = `<span class="text-gray-500">No tasks on ${date}</span>`; return; }
  box.innerHTML = list.map(t => {
    const k = t.type || classify(t.title);
    return `<label class="flex items-center gap-2 py-1.5">
      <input type="checkbox" ${t.done?'checked':''} onchange="toggleTaskDone('${t.id}', this.checked)" class="accent-purple-500" />
      <span class="${t.done?'line-through text-gray-500':'text-gray-200'} text-sm">${escapeHtml(t.title)}</span>
      <span class="text-[10px] text-gray-500 ml-auto">${k}</span>
    </label>`;
  }).join('');
}

function daysUntil(dateStr) {
  if (!dateStr) return 999;
  const a = new Date(dateStr + 'T00:00:00');
  const b = new Date(); b.setHours(0,0,0,0);
  return Math.round((a - b) / 86400000);
}

function runPlanMyDay() {
  const today = iso(new Date());
  const open = tasks.filter(t => !t.done);
  const candidates = [];
  open.forEach(t => {
    const k = t.type || classify(t.title);
    if (k === 'test') {
      if (t.due === today) candidates.push({ task: t, reason: 'Test is today (fixed)', priority: -1 });
      return;
    }
    if (k === 'revise') {
      candidates.push({ task: t, reason: daysUntil(t.due) <= 2 ? 'Revision due soon' : 'Üben/revise — do ahead', priority: daysUntil(t.due) });
      return;
    }
    if (daysUntil(t.due) <= 3) {
      candidates.push({ task: t, reason: daysUntil(t.due) < 0 ? 'Overdue' : daysUntil(t.due) === 0 ? 'Due today' : `Due in ${daysUntil(t.due)}d`, priority: daysUntil(t.due) });
    }
  });
  candidates.sort((a, b) => a.priority - b.priority);
  const upcoming = open.filter(t => (t.type || classify(t.title)) === 'test' && t.due > today)
    .sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);

  let html = `<div class="rounded-xl bg-surface/80 border border-purple-800/40 p-4"><h4 class="text-xs font-bold uppercase text-purple-400 mb-2">Today (${today})</h4>`;
  if (!candidates.length) html += `<p class="text-sm text-gray-400">No urgent HW / allowed revision for today.</p>`;
  else html += candidates.slice(0, 8).map((c) => {
    const k = c.task.type || classify(c.task.title);
    return `<label class="flex items-start gap-3 p-2.5 rounded-lg bg-black/30 mb-2">
      <input type="checkbox" ${c.task.done?'checked':''} onchange="toggleTaskDone('${c.task.id}', this.checked)" class="mt-1 accent-purple-500" />
      <div class="flex-1"><div class="text-sm text-white font-medium">${escapeHtml(c.task.title)}</div>
      <div class="text-[11px] text-gray-400">${escapeHtml(c.reason)} · due ${c.task.due||'?'}</div></div>
      <span class="text-[10px] text-purple-300">${k}</span></label>`;
  }).join('');
  html += `</div>`;
  if (upcoming.length) {
    html += `<div class="rounded-xl bg-rose-950/30 border border-rose-900/40 p-4 mt-3"><h4 class="text-xs font-bold uppercase text-rose-400 mb-2">Locked tests</h4>` +
      upcoming.map(t => `<div class="flex justify-between text-sm text-gray-300"><span>${escapeHtml(t.title)}</span><span class="text-rose-400 text-xs">${t.due}</span></div>`).join('') + `</div>`;
  }
  const o1 = document.getElementById('plan-output');
  const o2 = document.getElementById('plan-output-full');
  if (o1) { o1.classList.remove('hidden'); o1.innerHTML = html; }
  if (o2) o2.innerHTML = html;
}

function setAIMode(mode) {
  aiMode = mode;
  document.querySelectorAll('.ai-mode-btn').forEach(b => {
    const on = b.dataset.mode === mode;
    b.className = on
      ? 'ai-mode-btn px-2.5 py-1 rounded-lg bg-purple-900/50 text-purple-300 border border-purple-700/50'
      : 'ai-mode-btn px-2.5 py-1 rounded-lg text-gray-400 hover:bg-purple-900/30';
  });
}

function bootstrapChat() {
  const box = document.getElementById('chat-messages');
  if (!box || box.dataset.ready) return;
  box.dataset.ready = '1';
  box.innerHTML = `<div class="chat-ai rounded-2xl rounded-tl-sm p-4 text-sm text-gray-300 max-w-[90%]">
    <p class="mb-2">I'm <strong class="text-purple-300">StudyHub AI</strong> — revision sheets, plans, mock tests, practice sets, and active-recall flashcards.</p>
    <p class="mb-2">Pick a mode, attach files/links, then ask (e.g. "Revision sheet for Vokabeln 4.3").</p>
    <p class="text-xs text-gray-500">With Netlify GROK_API_KEY / OPENAI_API_KEY you get live model replies. Offline expert generator always works.</p>
  </div>`;
}

function handleFiles(e) {
  Array.from(e.target.files || []).forEach(f => attachments.push({ kind: 'file', name: f.name }));
  renderAttach();
}
function promptLink() {
  const url = prompt('Website URL for the AI to use as a source:');
  if (url && /^https?:\/\//i.test(url)) {
    attachments.push({ kind: 'link', name: url });
    renderAttach();
  }
}
function renderAttach() {
  const box = document.getElementById('attach-preview');
  if (!attachments.length) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  box.classList.remove('hidden');
  box.innerHTML = attachments.map((a, i) =>
    `<span class="inline-flex items-center gap-1 text-xs bg-purple-900/40 text-purple-200 px-2 py-1 rounded-lg border border-purple-700/40">
      <i class="fa-solid ${a.kind==='link'?'fa-link':'fa-file'}"></i> ${escapeHtml(a.name.slice(0,48))}
      <button onclick="attachments.splice(${i},1);renderAttach()" class="ml-1">&times;</button></span>`
  ).join('');
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text && !attachments.length) return;
  appendChat('user', escapeHtml(text || '(attachments)'));
  input.value = '';
  const sources = attachments.map(a => a.name);
  attachments = [];
  renderAttach();
  appendChat('ai', '<span class="text-purple-400"><i class="fa-solid fa-spinner fa-spin"></i> Thinking…</span>', true);
  document.getElementById('send-btn').disabled = true;
  try {
    const result = await callStudyAI(aiMode, text, sources);
    let bodyHtml = formatAIReply(result.reply, aiMode);
    if (result.offline) {
      bodyHtml += `<p class="text-[10px] text-amber-400/80 mt-2">Offline expert engine${result.apiError ? ' (' + escapeHtml(result.apiError) + ')' : ''}. Add GROK_API_KEY on Netlify for live model.</p>`;
    }
    const title = `${aiMode} — ${(text || 'study').slice(0, 40)}`;
    bodyHtml += `<div class="flex gap-2 mt-3"><button onclick='downloadMaterial(${JSON.stringify(title)}, ${JSON.stringify(result.reply)})' class="text-xs bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg"><i class="fa-solid fa-file-pdf"></i> Download / Print</button></div>`;
    replaceLastAI(bodyHtml);
    if (aiMode === 'flashcards') importCardsFromAI(result.reply);
    history.unshift({ id: Date.now(), type: aiMode, title, content: result.reply, created: new Date().toISOString() });
    saveHistory();
  } catch (e) {
    replaceLastAI(`<span class="text-rose-400">AI error: ${escapeHtml(e.message)}</span>`);
  }
  document.getElementById('send-btn').disabled = false;
}

async function callStudyAI(mode, prompt, sources) {
  try {
    const res = await fetch('/.netlify/functions/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, prompt, sources })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.reply) return data;
    }
  } catch (_) {}
  return { reply: clientExpert(mode, prompt, sources), mode, offline: true };
}

function clientExpert(mode, prompt, sources) {
  const topic = (prompt || 'your unit').trim();
  const src = sources?.length ? `\nSources: ${sources.join('; ')}\n` : '';
  if (mode === 'flashcards') {
    return JSON.stringify([
      { front: `Core idea of ${topic}?`, back: 'State it in one precise sentence from memory.' },
      { front: `3 key terms for ${topic}`, back: 'Write blank-paper, then check notes.' },
      { front: `Common exam trap in ${topic}?`, back: 'Similar terms mixed up; incomplete method; wrong case/tense.' },
      { front: `Teach ${topic} in 30 seconds`, back: 'If you stumble, that subsection needs more recall.' },
      { front: `One formula / pattern for ${topic}`, back: 'Write → cover → rewrite twice.' },
      { front: `Link ${topic} to a prior chapter`, back: 'Name the connection explicitly.' },
      { front: `Invent one short exam question on ${topic}`, back: 'Then answer without notes.' },
      { front: `What would the teacher mark wrong here?`, back: 'Missing steps, vague definitions, incomplete vocab.' },
      { front: `Cloze: The main point of ${topic} is ____.`, back: 'Fill from memory; verify with notes.' },
      { front: `When is ${topic} applied?`, back: 'Give a concrete classroom/exam scenario.' }
    ], null, 2);
  }
  if (mode === 'plan') {
    return `# Revision Plan — ${topic}\n${src}\n## Day 1 Map\n- Skeleton outline from memory\n- 10 flashcards\n\n## Day 2 Build\n- Fill gaps\n- Timed mini-quiz 15 min\n\n## Day 3 Stress test\n- Hard questions first\n- Rebuild weak cards\n\n## Day 4 Polish\n- Light review only · sleep\n\nFixed teacher tests stay on their due date; only *revision* moves.`;
  }
  if (mode === 'mock') {
    return `# Mock Test — ${topic}\nTime: 45–60 min\n${src}\n## Part A (8×2)\n1. Define the core of ${topic}.\n2. Two examples.\n3. One misconception + correction.\n4. Key vocab/symbols.\n5. Prior knowledge required.\n6. Steps for a typical problem.\n7. Compare two related ideas.\n8. Why it matters.\n\n## Part B (2×8)\n9. Full explanation with example.\n10. Diagnose a typical error + fix.\n\n## Part C (1×10)\n11. New application scenario.\n\n## Answer key\nAward marks for precise terms, clear structure, and correct method.`;
  }
  if (mode === 'practice') {
    return `# Practice — ${topic}\n${src}\n1. 5-min brain dump\n2. Circle gaps → notes only for those\n3. 5 cloze sentences\n4. 3 timed exercises\n5. Teach one idea aloud\n6. Rephrase definitions\n7. Rewrite one old mistake\n8. Drill weakest subtopic 10 min\n9. Interleave two subtopics\n10. Exit ticket: 3 bullets + 1 question`;
  }
  return `# Revision Sheet — ${topic}\n${src}\n## Big picture\nOne-sentence summary of ${topic}.\n\n## Must-know table\n| Concept | From memory | ✓ |\n|---------|-------------|---|\n| Core | | ☐ |\n| Term 1 | | ☐ |\n| Method | | ☐ |\n\n## Rules / patterns\n- Rule 1\n- Exceptions\n\n## Worked example\nWrite a typical Q → solve closed-book → check.\n\n## Common mistakes\n- A → fix\n- B → fix\n\n## Active recall\n1. Explain without looking\n2. Weakest point under stress?\n3. Link to earlier unit\n\n## Self-check\n- [ ] Definitions blank-paper\n- [ ] One timed exercise correct\n- [ ] Know the traps`;
}

function formatAIReply(reply, mode) {
  if (mode === 'flashcards') {
    try {
      const arr = JSON.parse(reply);
      if (Array.isArray(arr)) {
        return `<p class="text-purple-300 text-sm font-medium mb-2">Generated ${arr.length} cards (added to deck if valid)</p>` +
          arr.map((c, i) => `<div class="text-sm mb-2 p-2 rounded-lg bg-black/30"><span class="text-gray-500">${i+1}.</span> <strong class="text-white">${escapeHtml(c.front)}</strong><div class="text-gray-400 text-xs mt-0.5">${escapeHtml(c.back)}</div></div>`).join('');
      }
    } catch (_) {}
  }
  let h = escapeHtml(reply);
  h = h.replace(/^### (.*)$/gm, '<h4 class="text-purple-300 font-semibold mt-3 mb-1">$1</h4>');
  h = h.replace(/^## (.*)$/gm, '<h3 class="text-white font-semibold mt-3 mb-1">$1</h3>');
  h = h.replace(/^# (.*)$/gm, '<h2 class="text-white font-bold text-lg mb-2">$1</h2>');
  h = h.replace(/^\- (.*)$/gm, '<div class="text-sm text-gray-300 ml-2">• $1</div>');
  h = h.replace(/^\d+\. (.*)$/gm, '<div class="text-sm text-gray-300 ml-2">$&</div>');
  h = h.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
  h = h.replace(/\n\n/g, '<br><br>');
  return `<div class="prose-ai text-sm text-gray-300 space-y-1">${h}</div>`;
}

function importCardsFromAI(reply) {
  try {
    let text = reply.trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) text = fence[1].trim();
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) return;
    let n = 0;
    arr.forEach(c => {
      if (c.front && c.back) {
        cards.push({ id: Date.now() + '-' + n, front: String(c.front), back: String(c.back), tag: 'AI', ease: 2.5 });
        n++;
      }
    });
    if (n) saveCards();
  } catch (_) {}
}

function appendChat(role, html, temp) {
  const box = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = role === 'user'
    ? 'chat-user rounded-2xl rounded-tr-sm p-3.5 text-sm text-white max-w-[85%] ml-auto'
    : 'chat-ai rounded-2xl rounded-tl-sm p-4 text-sm text-gray-300 max-w-[92%]';
  if (temp) div.dataset.temp = '1';
  div.innerHTML = html;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
function replaceLastAI(html) {
  const box = document.getElementById('chat-messages');
  box.querySelectorAll('[data-temp]').forEach(n => n.remove());
  appendChat('ai', html);
}

function downloadMaterial(title, text) {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title>
    <style>body{font-family:system-ui;max-width:720px;margin:40px auto;padding:24px;line-height:1.5}h1{color:#6b21a8}pre{white-space:pre-wrap}</style></head>
    <body><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(text)}</pre>
    <script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

function setFCMode(m) {
  ['manual','ai','quizlet','paste'].forEach(id => {
    document.getElementById('fc-' + id)?.classList.toggle('hidden', id !== m);
  });
  document.querySelectorAll('.fc-mode').forEach(b => {
    const on = b.dataset.fc === m;
    b.className = on
      ? 'fc-mode px-3 py-1.5 rounded-lg text-xs bg-purple-900/50 text-purple-300 border border-purple-700/50'
      : 'fc-mode px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-purple-900/30';
  });
}

function addManualCard() {
  const front = document.getElementById('fc-front').value.trim();
  const back = document.getElementById('fc-back').value.trim();
  const tag = document.getElementById('fc-tag').value.trim() || 'General';
  if (!front || !back) return;
  cards.push({ id: String(Date.now()), front, back, tag, ease: 2.5 });
  saveCards();
  document.getElementById('fc-front').value = '';
  document.getElementById('fc-back').value = '';
}

async function generateAICards() {
  const prompt = document.getElementById('fc-ai-prompt').value.trim();
  const status = document.getElementById('fc-ai-status');
  const btn = document.getElementById('fc-ai-btn');
  if (!prompt) { status.textContent = 'Describe the topic first.'; return; }
  btn.disabled = true;
  status.textContent = 'Generating cards…';
  try {
    const result = await callStudyAI('flashcards', prompt, []);
    importCardsFromAI(result.reply);
    status.textContent = result.offline ? 'Generated offline expert cards (added to deck).' : 'AI cards generated and added to deck.';
    updateDeckUI();
  } catch (e) {
    status.textContent = 'Failed: ' + e.message;
  }
  btn.disabled = false;
}

function importQuizlet() {
  const url = document.getElementById('fc-quizlet-url').value.trim();
  const paste = document.getElementById('fc-quizlet-paste').value.trim();
  let n = 0;
  if (paste) n = importPairsText(paste, 'Quizlet');
  if (url.includes('quizlet.com')) {
    cards.push({ id: String(Date.now()), front: 'Quizlet set (open to study)', back: url, tag: 'Quizlet', ease: 2.5, source: url });
    n++;
    saveCards();
  }
  alert(n ? `Imported/saved ${n} item(s). For full term lists use Quizlet Export → paste into the box.` : 'Paste exported terms or a Quizlet URL.');
}

function importPaste() {
  const raw = document.getElementById('fc-paste-area').value.trim();
  const n = importPairsText(raw, 'Import');
  document.getElementById('fc-paste-area').value = '';
  alert(`Imported ${n} cards`);
}

function importPairsText(raw, tag) {
  let n = 0;
  raw.split('\n').forEach(line => {
    line = line.trim();
    if (!line) return;
    let front, back;
    if (line.includes('\t')) [front, back] = line.split('\t');
    else if (line.includes(' - ')) [front, back] = line.split(/ - (.+)/s);
    else if (line.includes(' — ')) [front, back] = line.split(/ — (.+)/s);
    else if (line.includes(':')) [front, back] = line.split(/:(.+)/s);
    else return;
    if (front && back) {
      cards.push({ id: Date.now() + '-' + n, front: front.trim(), back: back.trim(), tag, ease: 2.5 });
      n++;
    }
  });
  if (n) saveCards();
  return n;
}

function updateDeckUI() {
  const el = document.getElementById('deck-count');
  if (el) el.textContent = cards.length;
  const list = document.getElementById('deck-list');
  if (!list) return;
  if (!cards.length) { list.innerHTML = '<p class="text-gray-500 text-sm">No cards yet.</p>'; return; }
  list.innerHTML = cards.slice().reverse().slice(0, 50).map(c =>
    `<div class="flex justify-between items-center p-2.5 rounded-lg bg-surface border border-purple-900/30 text-sm">
      <div class="truncate flex-1 mr-2"><span class="text-purple-300">${escapeHtml(c.front)}</span> <span class="text-gray-500">→</span> <span class="text-gray-400">${escapeHtml(c.back)}</span></div>
      <button onclick="deleteCard('${c.id}')" class="text-rose-400 text-xs">✕</button></div>`
  ).join('');
}
function deleteCard(id) { cards = cards.filter(c => c.id !== id); saveCards(); }
function clearDeck() { if (confirm('Clear deck?')) { cards = []; saveCards(); } }
function startStudy() {
  if (!cards.length) return alert('Add cards first');
  studyQueue = [...cards].sort(() => Math.random() - 0.5);
  studyIndex = 0;
  document.getElementById('study-area').classList.remove('hidden');
  showStudyCard();
}
function showStudyCard() {
  const c = studyQueue[studyIndex];
  if (!c) return;
  document.getElementById('study-front').textContent = c.front;
  document.getElementById('study-back').textContent = c.back;
  document.querySelector('.flashcard')?.classList.remove('flipped');
  document.getElementById('study-progress').textContent = `${studyIndex + 1} / ${studyQueue.length}`;
}
function flipCard() { document.querySelector('.flashcard')?.classList.toggle('flipped'); }
function rateStudy() {
  studyIndex++;
  if (studyIndex >= studyQueue.length) {
    document.getElementById('study-area').classList.add('hidden');
    alert('Session complete');
    return;
  }
  showStudyCard();
}

function renderHistory() {
  const box = document.getElementById('revision-history');
  if (!box) return;
  if (!history.length) { box.innerHTML = 'No saved materials yet.'; return; }
  box.innerHTML = history.map(h =>
    `<div class="p-3 rounded-lg bg-surface border border-purple-900/30">
      <div class="flex justify-between text-xs text-purple-400 mb-1"><span>${escapeHtml(h.type)}</span><span>${new Date(h.created).toLocaleString()}</span></div>
      <div class="text-sm text-white font-medium">${escapeHtml(h.title)}</div></div>`
  ).join('');
}

applyTheme();
if (session && session.email) {
  enterApp();
} else {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}
