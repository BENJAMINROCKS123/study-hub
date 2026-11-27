/**
 * StudyHub AI — Vercel serverless.
 * Set OPENAI_API_KEY for live model; otherwise offline expert engine.
 */

const SYSTEM_PROMPT = `You are StudyHub AI — an elite academic tutor and exam coach for secondary/high-school students (including German-speaking curricula: Deutsch, Vokabeln, Lektionstests, Geschichte, Mathematik, etc.).

Produce HIGH-QUALITY, immediately usable study materials:

1) REVISION SHEETS — Overview, key concepts, definitions, formulas/vocab, common mistakes, active-recall questions, summary. Markdown. Cloze prompts welcome.
2) REVISION PLANS — Day-by-day, active recall + spaced practice. Never move fixed teacher tests; only schedule revision for them.
3) MOCK TESTS — Mixed short/structured/application questions + separate ANSWER KEY + time suggestion.
4) PRACTICE — Mixed drills with brief answers at the end.
5) FLASHCARDS — When asked for flashcards, respond with ONLY a JSON array: [{"front":"...","back":"..."}]. Active-recall wording. 8–20 cards unless asked otherwise.

Match the student's language when possible. Be specific to named topics. Dense, exam-useful, no fluff.`;

function buildUserMessage(mode, prompt, sources) {
  const src = sources.length
    ? `\nSources the student attached:\n${sources.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
    : '';
  const modeHint = {
    sheet: 'Create a complete REVISION SHEET in markdown.',
    plan: 'Create a multi-day REVISION PLAN in markdown.',
    mock: 'Create a full MOCK TEST with questions AND a separate answer key.',
    practice: 'Create a PRACTICE SET with mixed questions and brief answers at the end.',
    flashcards: 'Create FLASHCARDS. Respond with ONLY a valid JSON array of objects with "front" and "back" keys.'
  }[mode] || 'Help the student study.';
  return `${modeHint}\n\nStudent request:\n${prompt || '(generic secondary-school study set)'}\n${src}`;
}

function offlineExpert(mode, prompt, sources) {
  const topic = (prompt || 'your upcoming unit').trim();
  const srcLine = sources.length ? `\n_Sources noted: ${sources.join('; ')}_\n` : '';

  if (mode === 'flashcards') {
    return JSON.stringify([
      { front: `What is the core idea of: ${topic}?`, back: 'State the main concept in one precise sentence from memory, then check notes.' },
      { front: `List 3 must-know terms related to ${topic}`, back: 'Write them blank-paper style, then verify definitions.' },
      { front: `Common exam trap for ${topic}?`, back: 'Students mix up similar terms or skip units — always check the question stem.' },
      { front: `Explain ${topic} to a classmate in 30 seconds`, back: 'If you cannot, that section needs more active recall.' },
      { front: `One formula / rule / verb pattern for ${topic}`, back: 'Write it, cover it, rewrite from memory twice.' },
      { front: `Connect ${topic} to a previous chapter`, back: 'Name the link (cause/effect, contrast, prerequisite).' },
      { front: `Create one exam-style short question on ${topic}`, back: 'Then answer it without looking.' },
      { front: `What would the teacher mark wrong most often here?`, back: 'Incomplete answers, wrong case/tense, missing steps.' },
      { front: `Cloze: The main point of ${topic} is ____.`, back: 'Fill from memory; verify with notes.' },
      { front: `When is ${topic} applied?`, back: 'Give a concrete classroom/exam scenario.' }
    ], null, 2);
  }

  if (mode === 'plan') {
    return `# Revision Plan — ${topic}\n${srcLine}\n## Goal\nConfident via **active recall**, not passive rereading.\n\n### Day 1 — Map\n- Skeleton outline from memory\n- 10 flashcards\n\n### Day 2 — Build\n- Fill gaps\n- Timed mini-quiz 15 min\n\n### Day 3 — Stress test\n- Hard questions first\n- Rebuild weak cards\n\n### Day 4 — Polish\n- Light review · sleep\n\nFixed teacher tests stay on their due date; only *revision* moves.`;
  }

  if (mode === 'mock') {
    return `# Mock Test — ${topic}\n**Time:** 45–60 min\n${srcLine}\n## Part A (8×2)\n1. Define the core of ${topic}.\n2. Two examples.\n3. One misconception + correction.\n4. Key vocab/symbols.\n5. Prior knowledge required.\n6. Steps for a typical problem.\n7. Compare two related ideas.\n8. Why it matters.\n\n## Part B (2×8)\n9. Full explanation with example.\n10. Diagnose a typical error + fix.\n\n## Part C (1×10)\n11. New application scenario.\n\n## Answer key\nPrecise terms + clear structure.`;
  }

  if (mode === 'practice') {
    return `# Practice — ${topic}\n${srcLine}\n1. 5-min brain dump\n2. Circle gaps → notes only for those\n3. 5 cloze sentences\n4. 3 timed exercises\n5. Teach one idea aloud\n6. Rephrase definitions\n7. Rewrite one old mistake\n8. Drill weakest subtopic 10 min\n9. Interleave two subtopics\n10. Exit ticket: 3 bullets + 1 question`;
  }

  return `# Revision Sheet — ${topic}\n${srcLine}\n## Big picture\nOne-sentence summary of ${topic}.\n\n## Must-know\n| Concept | From memory | ✓ |\n|---------|-------------|---|\n| Core | | ☐ |\n| Term 1 | | ☐ |\n| Method | | ☐ |\n\n## Rules / patterns\n- Rule 1\n- Exceptions\n\n## Worked example\nWrite a typical Q → solve closed-book → check.\n\n## Common mistakes\n- A → fix\n- B → fix\n\n## Active recall\n1. Explain without looking\n2. Weakest point under stress?\n3. Link to earlier unit\n\n## Self-check\n- [ ] Definitions blank-paper\n- [ ] One timed exercise correct\n- [ ] Know the traps`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }
  body = body || {};
  const mode = body.mode || 'sheet';
  const prompt = body.prompt || '';
  const sources = Array.isArray(body.sources) ? body.sources : [];
  const userMessage = buildUserMessage(mode, prompt, sources);

  const apiKey = process.env.OPENAI_API_KEY || process.env.GROK_API_KEY;
  const isGrok = !process.env.OPENAI_API_KEY && !!process.env.GROK_API_KEY;
  const base = process.env.OPENAI_BASE_URL
    || (isGrok ? 'https://api.x.ai/v1' : (apiKey ? 'https://api.openai.com/v1' : null));
  const model = process.env.AI_MODEL || (isGrok ? (process.env.GROK_MODEL || 'grok-3') : 'gpt-4o-mini');

  if (!apiKey || !base) {
    return res.status(200).json({
      reply: offlineExpert(mode, prompt, sources),
      mode,
      offline: true,
      note: 'Offline expert — set OPENAI_API_KEY on Vercel for live model'
    });
  }

  try {
    const r = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.5,
        max_tokens: 2500
      })
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(200).json({
        reply: offlineExpert(mode, prompt, sources),
        mode,
        offline: true,
        apiError: data.error?.message || r.statusText
      });
    }
    const reply = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ reply, mode, offline: false });
  } catch (err) {
    return res.status(200).json({
      reply: offlineExpert(mode, prompt, sources),
      mode,
      offline: true,
      apiError: err.message
    });
  }
};
