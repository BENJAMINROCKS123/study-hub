// StudyHub core — see repo for full logic
const STORAGE_TASKS = 'studyhub_tasks_v2';
const STORAGE_CARDS = 'studyhub_cards_v2';
const STORAGE_HISTORY = 'studyhub_history_v2';
const STORAGE_DRIVE = 'studyhub_drive';

let tasks = JSON.parse(localStorage.getItem(STORAGE_TASKS) || '[]');
let cards = JSON.parse(localStorage.getItem(STORAGE_CARDS) || '[]');
let history = JSON.parse(localStorage.getItem(STORAGE_HISTORY) || '[]');
let calDate = new Date();
let selectedDay = formatISO(new Date());
let aiMode = 'sheet';
let attachments = [];
let studyIndex = 0;
let studyQueue = [];

const SEED = [
  { id: 's1', title: 'Vokabeln 4.3 ins Heft schreiben', type: 'hw', status: 'Not started', priority: 'Low', due: '2026-11-27' },
  { id: 's2', title: 'Buch S. 31 Nr. 1', type: 'hw', status: 'To Do', priority: 'High', due: '2026-11-27' },
  { id: 's3', title: 'Math Test 2', type: 'test', status: 'Not started', priority: null, due: '2026-11-30' },
  { id: 's4', title: 'Revise math test-geometry', type: 'revise', status: 'Not started', priority: 'Low', due: '2026-11-30' },
  { id: 's5', title: 'Vokabeln Test 4.3', type: 'test', status: 'Not started', priority: 'Medium', due: '2026-11-30' },
  { id: 's6', title: 'Üben für den Vokabeln Test 4.3', type: 'revise', status: 'To Do', priority: 'Medium', due: '2026-11-30' },
  { id: 's7', title: 'Write the Liedtexte for Dumb ways to die', type: 'hw', status: 'Not started', priority: 'Medium', due: '2026-11-30' },
  { id: 's8', title: 'Vokabeln Test-Wiedergabe', type: 'test', status: 'Not started', priority: 'Low', due: '2026-12-01' },
  { id: 's9', title: '工作紙做完', type: 'hw', status: 'In progress', priority: 'High', due: '2026-12-01' },
  { id: 's10', title: 'Geography Test', type: 'test', status: 'Not started', priority: null, due: '2026-12-02' },
  { id: 's11', title: 'Intensivtrainer fertig machen', type: 'hw', status: 'To Do', priority: 'Low', due: '2026-12-03' },
  { id: 's12', title: 'Üben für Lektionstest-Kapitel 4', type: 'revise', status: 'To Do', priority: 'Low', due: '2026-12-07' },
  { id: 's13', title: 'Lektionstest-Kapitel 4', type: 'test', status: 'Not started', priority: 'Medium', due: '2026-12-07' },
];

if (tasks.length === 0) {
  tasks = SEED.map(t => ({ ...t, done: false }));
  saveTasks();
}

function formatISO(d) { return d.toISOString().slice(0, 10); }
function saveTasks() { localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks)); }
function saveCards() { localStorage.setItem(STORAGE_CARDS, JSON.stringify(cards)); updateDeckUI(); }
function saveHistory() { localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history)); }

function classify(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('üben') || t.includes('uben') || t.includes('revise') || t.includes('revision')) return 'revise';
  if (t.includes('test') || t.includes('exam') || t.includes('klausur') || t.includes('lektionstest') || t.includes('vokabeln test')) return 'test';
  return 'hw';
}

function showView(name) {
  document.querySelectorAll('section[id^="view-"]').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById('view-' + name);
  if (el) el.classList.remove('hidden');
  document.querySelectorAll('.sidebar-link').forEach(a => a.classList.toggle('active', a.dataset.view === name));
  const titles = { home: 'Home', calendar: 'Calendar', flashcards: 'Flashcards', revision: 'Revision Sheets', plan: 'Plan My Day', settings: 'Settings / Sync' };
  document.getElementById('view-title').textContent = titles[name] || name;
  if (name === 'calendar') renderCalendar();
  if (name === 'flashcards') updateDeckUI();
  if (name === 'revision') renderHistory();
}

function changeMonth(delta) { calDate.setMonth(calDate.getMonth() + delta); renderCalendar(); }
function goToday() { calDate = new Date(); selectedDay = formatISO(new Date()); renderCalendar(); }

function renderCalendar() {
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  document.getElementById('cal-title').textContent = calDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const parent = document.getElementById('cal-grid').parentElement;
  Array.from(parent.children).forEach((c, i) => { if (i >= 7) c.remove(); });
  const today = formatISO(new Date());
  for (let i = 0; i < startPad; i++) {
    const empty = document.createElement('div');
    empty.className = 'bg-void/50 day-box';
    parent.appendChild(empty);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTasks = tasks.filter(t => t.due === iso && !t.done);
    const cell = document.createElement('div');
    cell.className = `bg-panel day-box p-1.5 cursor-pointer hover:bg-purple-900/20 transition border-t border-purple-900/20 ${dayTasks.length ? 'has-tasks' : ''} ${iso === selectedDay ? 'ring-1 ring-purple-500' : ''} ${iso === today ? 'ring-1 ring-indigo-400' : ''}`;
    cell.onclick = () => { selectedDay = iso; renderCalendar(); showDayDetail(iso); };
    let html = `<div class="text-[11px] font-medium ${iso === today ? 'text-indigo-300' : 'text-gray-400'} mb-1">${d}</div>`;
    dayTasks.slice(0, 3).forEach(t => {
      const kind = t.type || classify(t.title);
      const color = kind === 'test' ? 'bg-rose-500' : kind === 'revise' ? 'bg-amber-400' : 'bg-indigo-400';
      html += `<div class="text-[9px] truncate px-1 py-0.5 rounded mb-0.5 bg-black/40 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full ${color} shrink-0"></span>${escapeHtml(t.title)}</div>`;
    });
    if (dayTasks.length > 3) html += `<div class="text-[9px] text-purple-400">+${dayTasks.length - 3} more</div>`;
    cell.innerHTML = html;
    parent.appendChild(cell);
  }
  showDayDetail(selectedDay);
}

function showDayDetail(iso) {
  const list = tasks.filter(t => t.due === iso);
  const box = document.getElementById('day-detail');
  if (!list.length) { box.innerHTML = `<span class="text-gray-500">No tasks on ${iso}</span>`; return; }
  box.innerHTML = list.map(t => {
    const kind = t.type || classify(t.title);
    const badge = kind === 'test' ? 'bg-rose-900/50 text-rose-300' : kind === 'revise' ? 'bg-amber-900/50 text-amber-300' : 'bg-indigo-900/50 text-indigo-300';
    return `<div class="flex items-center justify-between py-1.5 border-b border-purple-900/20 last:border-0"><span class="text-gray-200">${escapeHtml(t.title)}</span><span class="text-[10px] px-2 py-0.5 rounded ${badge}">${kind}</span></div>`;
  }).join('');
}

function runPlanMyDay() {
  const today = formatISO(new Date());
  const btn = document.getElementById('plan-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Planning…'; }
  const open = tasks.filter(t => !t.done && t.status !== 'Done');
  const testsToday = open.filter(t => (t.type || classify(t.title)) === 'test' && t.due === today);
  const reviseTasks = open.filter(t => (t.type || classify(t.title)) === 'revise').sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  const hwTasks = open.filter(t => (t.type || classify(t.title)) === 'hw').sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  const todayCandidates = [];
  testsToday.forEach(t => todayCandidates.push({ task: t, reason: 'Test is today — fixed by teacher', priority: 0 }));
  reviseTasks.forEach(t => {
    const days = daysUntil(t.due);
    todayCandidates.push({ task: t, reason: days <= 2 ? 'Revision due very soon' : 'Revision / Üben — good to do ahead', priority: days });
  });
  hwTasks.forEach(t => {
    const days = daysUntil(t.due);
    if (days <= 3) todayCandidates.push({ task: t, reason: days < 0 ? 'Overdue' : days === 0 ? 'Due today' : `Due in ${days} day(s)`, priority: days });
  });
  todayCandidates.sort((a, b) => a.priority - b.priority);
  const upcomingTests = open.filter(t => (t.type || classify(t.title)) === 'test' && t.due > today).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  const html = buildPlanHTML(todayCandidates, upcomingTests, today);
  const out = document.getElementById('plan-output');
  const outFull = document.getElementById('plan-output-full');
  if (out) { out.classList.remove('hidden'); out.innerHTML = html; }
  if (outFull) outFull.innerHTML = html;
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Plan My Day'; }
}

function daysUntil(iso) {
  if (!iso) return 999;
  const a = new Date(iso + 'T00:00:00');
  const b = new Date(); b.setHours(0,0,0,0);
  return Math.round((a - b) / 86400000);
}

function buildPlanHTML(candidates, upcomingTests, today) {
  let h = `<div class="rounded-xl bg-surface/80 border border-purple-800/40 p-4"><h4 class="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">Today’s focus (${today})</h4>`;
  if (!candidates.length) h += `<p class="text-sm text-gray-400">No urgent homework or allowed revision tasks for today.</p>`;
  else h += `<div class="space-y-2">` + candidates.slice(0, 8).map((c, i) => {
    const k = c.task.type || classify(c.task.title);
    const badge = k === 'test' ? 'bg-rose-900/50 text-rose-300' : k === 'revise' ? 'bg-amber-900/50 text-amber-300' : 'bg-indigo-900/50 text-indigo-300';
    return `<div class="flex items-start gap-3 p-2.5 rounded-lg bg-black/30"><span class="text-purple-400 font-mono text-xs mt-0.5">${i + 1}</span><div class="flex-1"><div class="text-sm text-white font-medium">${escapeHtml(c.task.title)}</div><div class="text-[11px] text-gray-400 mt-0.5">${escapeHtml(c.reason)} · due ${c.task.due || '?'}</div></div><span class="text-[10px] px-2 py-0.5 rounded ${badge}">${k}</span></div>`;
  }).join('') + `</div>`;
  h += `</div>`;
  if (upcomingTests.length) {
    h += `<div class="rounded-xl bg-rose-950/30 border border-rose-900/40 p-4 mt-3"><h4 class="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">Fixed teacher tests (locked)</h4><div class="space-y-1.5">` +
      upcomingTests.map(t => `<div class="flex justify-between text-sm"><span class="text-gray-300">${escapeHtml(t.title)}</span><span class="text-rose-400/80 text-xs">${t.due}</span></div>`).join('') + `</div></div>`;
  }
  return h;
}

function setAIMode(mode) {
  aiMode = mode;
  document.querySelectorAll('.ai-mode-btn').forEach(b => {
    const on = b.dataset.mode === mode;
    b.className = on ? 'ai-mode-btn px-2.5 py-1 rounded-lg bg-purple-900/50 text-purple-300 border border-purple-700/50' : 'ai-mode-btn px-2.5 py-1 rounded-lg text-gray-400 hover:bg-purple-900/30';
  });
}

function handleFiles(e) {
  Array.from(e.target.files).forEach(f => attachments.push({ kind: 'file', name: f.name, size: f.size }));
  renderAttachPreview();
}
function promptLink() {
  const url = prompt('Paste a website URL the AI should read as a source:');
  if (url && url.startsWith('http')) { attachments.push({ kind: 'link', name: url, url }); renderAttachPreview(); }
}
function renderAttachPreview() {
  const box = document.getElementById('attach-preview');
  if (!attachments.length) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  box.classList.remove('hidden');
  box.innerHTML = attachments.map((a, i) => `<span class="inline-flex items-center gap-1.5 text-xs bg-purple-900/40 text-purple-200 px-2.5 py-1 rounded-lg border border-purple-700/40"><i class="fa-solid ${a.kind === 'link' ? 'fa-link' : 'fa-file'}"></i>${escapeHtml(a.name.length > 40 ? a.name.slice(0,37)+'…' : a.name)}<button onclick="removeAttach(${i})" class="text-purple-400 hover:text-white">&times;</button></span>`).join('');
}
function removeAttach(i) { attachments.splice(i, 1); renderAttachPreview(); }

async function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text && !attachments.length) return;
  appendChat('user', text || '(attachments only)');
  input.value = '';
  const sources = [...attachments];
  attachments = [];
  renderAttachPreview();
  appendChat('ai', '<span class="text-purple-400"><i class="fa-solid fa-spinner fa-spin"></i> Generating…</span>', true);
  await sleep(900 + Math.random() * 800);
  const reply = generateAIResponse(text, aiMode, sources);
  replaceLastAI(reply.html);
  if (reply.save) {
    history.unshift({ id: Date.now(), type: aiMode, title: reply.title, content: reply.raw, created: new Date().toISOString() });
    saveHistory();
  }
}

function generateAIResponse(prompt, mode, sources) {
  const topic = prompt || 'your subjects';
  const srcNote = sources.length ? `<p class="text-xs text-purple-400 mt-2">Used ${sources.length} source(s): ${sources.map(s => escapeHtml(s.name)).join(', ')}</p>` : '';
  const titles = { sheet: `Revision Sheet — ${topic.slice(0,40)}`, plan: `Revision Plan — ${topic.slice(0,40)}`, mock: `Mock Test — ${topic.slice(0,40)}`, practice: `Practice Set — ${topic.slice(0,40)}` };
  let body = '';
  if (mode === 'sheet') body = `<h4 class="font-semibold text-purple-300 mb-2">${titles.sheet}</h4><p class="text-sm text-gray-300 mb-3">Key concepts for: <em>${escapeHtml(topic)}</em></p><ul class="list-disc list-inside text-sm text-gray-300 space-y-1.5"><li><strong>Core definitions</strong> — write from memory.</li><li><strong>3 “why” questions</strong>.</li><li><strong>Common mistakes</strong>.</li><li><strong>Quick self-quiz</strong> (5 cloze prompts).</li></ul><p class="text-xs text-gray-500 mt-3">Connect GROK_API_KEY / OPENAI_API_KEY on Netlify for full AI content from PDFs.</p>`;
  else if (mode === 'plan') body = `<h4 class="font-semibold text-purple-300 mb-2">${titles.plan}</h4><ol class="list-decimal list-inside text-sm text-gray-300 space-y-2"><li>Day 1–2: Map syllabus / teacher PDF.</li><li>Day 3–4: Active recall + spaced review.</li><li>Day 5: Timed practice.</li><li>Day before test: light review only.</li></ol>`;
  else if (mode === 'mock') body = `<h4 class="font-semibold text-purple-300 mb-2">${titles.mock}</h4><p class="text-sm text-gray-300 mb-2">45–60 min structure:</p><ul class="list-disc list-inside text-sm text-gray-300 space-y-1"><li>Part A — 8 short answers</li><li>Part B — 2 longer responses</li><li>Part C — application problem</li></ul>`;
  else body = `<h4 class="font-semibold text-purple-300 mb-2">${titles.practice}</h4><p class="text-sm text-gray-300">10 mixed practice prompts for: <em>${escapeHtml(topic)}</em>.</p>`;
  const fullText = stripHtml(body);
  const html = `<div class="space-y-2">${body}${srcNote}<div class="flex gap-2 mt-3"><button onclick="downloadPDF('x', \`${escapeAttr(titles[mode])}\`, \`${escapeAttr(fullText)}\`)" class="text-xs bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg"><i class="fa-solid fa-file-pdf"></i> Download PDF</button><button onclick="copyText(\`${escapeAttr(fullText)}\`)" class="text-xs bg-panel border border-purple-700/50 text-purple-300 px-3 py-1.5 rounded-lg">Copy</button></div></div>`;
  return { html, title: titles[mode], raw: fullText, save: true };
}

function appendChat(role, content, temp) {
  const box = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = role === 'user' ? 'chat-bubble-user rounded-2xl rounded-tr-sm p-3.5 text-sm text-white max-w-[85%] ml-auto' : 'chat-bubble-ai rounded-2xl rounded-tl-sm p-4 text-sm text-gray-300 max-w-[90%]';
  if (temp) div.dataset.temp = '1';
  div.innerHTML = content;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
function replaceLastAI(html) {
  const box = document.getElementById('chat-messages');
  const temps = box.querySelectorAll('[data-temp]');
  if (temps.length) temps[temps.length - 1].remove();
  appendChat('ai', html);
}
function downloadPDF(id, title, text) {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:system-ui;max-width:700px;margin:40px auto;padding:20px}h1{color:#6b21a8}pre{white-space:pre-wrap}</style></head><body><h1>${title}</h1><pre>${String(text).replace(/</g,'&lt;')}</pre><script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}
function copyText(t) { navigator.clipboard.writeText(t).then(() => alert('Copied')); }

function setFCMode(m) {
  ['manual','ai','quizlet','paste'].forEach(id => document.getElementById('fc-'+id).classList.toggle('hidden', id !== m));
  document.querySelectorAll('.fc-mode').forEach(b => {
    const on = b.dataset.fc === m;
    b.className = on ? 'fc-mode px-3 py-1.5 rounded-lg text-xs bg-purple-900/50 text-purple-300 border border-purple-700/50' : 'fc-mode px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-purple-900/30';
  });
}
function addManualCard() {
  const front = document.getElementById('fc-front').value.trim();
  const back = document.getElementById('fc-back').value.trim();
  const tag = document.getElementById('fc-tag').value.trim() || 'General';
  if (!front || !back) return;
  cards.push({ id: Date.now().toString(), front, back, tag, ease: 2.5 });
  saveCards();
  document.getElementById('fc-front').value = '';
  document.getElementById('fc-back').value = '';
}
function generateAICards() {
  const prompt = document.getElementById('fc-ai-prompt').value.trim();
  if (!prompt) return;
  [{ front: `Key idea: ${prompt.slice(0,50)}`, back: 'Write definition from memory.' }, { front: 'Common mistake?', back: 'Check teacher notes.' }, { front: 'One-sentence summary', back: 'Active recall > re-reading.' }].forEach(s => cards.push({ id: Date.now()+Math.random().toString(36).slice(2), ...s, tag: 'AI', ease: 2.5 }));
  saveCards();
  alert('Added demo AI cards. Add API key on Netlify for full generation.');
}
function importQuizlet() {
  const url = document.getElementById('fc-quizlet-url').value.trim();
  if (!url.includes('quizlet.com')) { alert('Paste a Quizlet URL'); return; }
  cards.push({ id: Date.now().toString(), front: 'Quizlet set', back: url, tag: 'Quizlet', ease: 2.5, source: url });
  saveCards();
  alert('Link saved. Full import needs a backend proxy.');
}
function importPaste() {
  const raw = document.getElementById('fc-paste-area').value.trim();
  if (!raw) return;
  let n = 0;
  raw.split('\n').forEach(line => {
    line = line.trim(); if (!line) return;
    let front, back;
    if (line.includes('\t')) [front, back] = line.split('\t');
    else if (line.includes(' - ')) [front, back] = line.split(' - ');
    else if (line.includes(':')) [front, back] = line.split(':');
    else return;
    if (front && back) { cards.push({ id: Date.now()+'-'+n, front: front.trim(), back: back.trim(), tag: 'Import', ease: 2.5 }); n++; }
  });
  saveCards();
  document.getElementById('fc-paste-area').value = '';
  alert('Imported ' + n + ' cards');
}
function updateDeckUI() {
  document.getElementById('deck-count').textContent = cards.length;
  const list = document.getElementById('deck-list');
  if (!cards.length) { list.innerHTML = '<p class="text-gray-500 text-sm">No cards yet.</p>'; return; }
  list.innerHTML = cards.slice().reverse().slice(0,40).map(c => `<div class="flex justify-between items-center p-2.5 rounded-lg bg-surface border border-purple-900/30 text-sm"><div class="truncate flex-1 mr-2"><span class="text-purple-300">${escapeHtml(c.front)}</span> <span class="text-gray-500">→</span> <span class="text-gray-400">${escapeHtml(c.back)}</span></div><button onclick="deleteCard('${c.id}')" class="text-rose-400/70 hover:text-rose-300 text-xs">✕</button></div>`).join('');
}
function deleteCard(id) { cards = cards.filter(c => c.id !== id); saveCards(); }
function clearDeck() { if (confirm('Clear entire deck?')) { cards = []; saveCards(); } }
function startStudy() {
  if (!cards.length) { alert('Add cards first'); return; }
  studyQueue = [...cards].sort(() => Math.random() - 0.5);
  studyIndex = 0;
  document.getElementById('study-area').classList.remove('hidden');
  showStudyCard();
}
function showStudyCard() {
  const c = studyQueue[studyIndex]; if (!c) return;
  document.getElementById('study-front').textContent = c.front;
  document.getElementById('study-back').textContent = c.back;
  document.querySelector('.flashcard').classList.remove('flipped');
  document.getElementById('study-progress').textContent = `${studyIndex+1} / ${studyQueue.length}`;
}
function flipCard() { document.querySelector('.flashcard').classList.toggle('flipped'); }
function rateStudy(r) {
  studyIndex++;
  if (studyIndex >= studyQueue.length) { document.getElementById('study-area').classList.add('hidden'); alert('Session done!'); return; }
  showStudyCard();
}

async function syncNotion() {
  const label = document.getElementById('sync-label');
  const dot = document.getElementById('sync-dot');
  const status = document.getElementById('settings-sync-status');
  label.textContent = 'Syncing…';
  dot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
  try {
    const res = await fetch('/.netlify/functions/notion');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.tasks) && data.tasks.length) {
        tasks = data.tasks.map(t => ({
          id: t.id || String(Math.random()),
          title: t.title || 'Untitled',
          type: mapTaskType(t.taskType || classify(t.title || '')),
          status: t.status || 'Not started',
          priority: t.priority,
          due: t.due || null,
          done: (t.status) === 'Done'
        }));
        saveTasks();
        label.textContent = 'Synced with Notion';
        dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        if (status) status.textContent = `Loaded ${tasks.length} tasks from Notion`;
        renderCalendar();
        return;
      }
    }
  } catch (e) {}
  label.textContent = 'Local mode (demo data)';
  dot.className = 'w-2 h-2 rounded-full bg-amber-500';
  if (status) status.textContent = 'Netlify Notion function not reachable. Using local tasks.';
  renderCalendar();
}
function mapTaskType(raw) {
  if (!raw) return 'hw';
  const s = String(raw).toLowerCase();
  if (s.includes('exam') || s.includes('test') || s.includes('🚩')) return 'test';
  if (s.includes('revision') || s.includes('üben') || s.includes('📑')) return 'revise';
  return 'hw';
}
function loadSeedTasks() {
  tasks = SEED.map(t => ({ ...t, done: false }));
  saveTasks();
  document.getElementById('settings-sync-status').textContent = 'Demo tasks loaded.';
  renderCalendar();
}
function saveDrive() {
  localStorage.setItem(STORAGE_DRIVE, document.getElementById('drive-url').value.trim());
  alert('Saved');
}
function renderHistory() {
  const box = document.getElementById('revision-history');
  if (!history.length) { box.innerHTML = 'No materials yet.'; return; }
  box.innerHTML = history.map(h => `<div class="p-3 rounded-lg bg-surface border border-purple-900/30"><div class="flex justify-between text-xs text-purple-400 mb-1"><span>${h.type}</span><span>${new Date(h.created).toLocaleString()}</span></div><div class="text-sm text-white font-medium">${escapeHtml(h.title)}</div></div>`).join('');
}
function escapeHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escapeAttr(s) { return String(s||'').replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$/g,'\\$').replace(/"/g,'&quot;'); }
function stripHtml(html) { const d = document.createElement('div'); d.innerHTML = html; return d.textContent || ''; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

document.getElementById('today-label').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
const drive = localStorage.getItem(STORAGE_DRIVE);
if (drive && document.getElementById('drive-url')) document.getElementById('drive-url').value = drive;
updateDeckUI();
renderCalendar();
