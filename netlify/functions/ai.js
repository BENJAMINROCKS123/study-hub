/**
 * Expert study AI backend.
 * Set GROK_API_KEY (preferred) or OPENAI_API_KEY in Netlify environment variables.
 */

const SYSTEM_PROMPT = `You are StudyHub AI — an elite academic tutor and exam coach for secondary/high-school students (including German-speaking curricula: Deutsch, Vokabeln, Lektionstests, Geschichte, Mathematik, etc.).

Your job is to produce HIGH-QUALITY, immediately usable study materials:

1) REVISION SHEETS
- Clear structure: Overview → Key concepts → Definitions → Formulas/Vocab tables → Common mistakes → Active-recall questions → Mini summary
- Prefer bullet points and tables in markdown
- Include cloze-style prompts

2) REVISION PLANS
- Day-by-day schedule tied to a test date when given
- Mix active recall, spaced repetition, and timed practice
- Never schedule fixed teacher tests on other days; only revision for them

3) MOCK TESTS / PRACTICE EXAMS
- Realistic question mix: short answer, structured, application
- Include a separate ANSWER KEY section
- Suggest time limits

4) FLASHCARDS
- Output ONLY a JSON array when asked for flashcards: [{"front":"...","back":"..."}]
- Front = question/term; Back = precise answer
- Prefer active-recall wording
- 8–20 cards unless user asks otherwise

Rules:
- Match the user's language when possible
- Be specific to the topics they name
- No fluff. Dense, exam-useful content.
- Use markdown.`;

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) };
  }

  const grokKey = process.env.GROK_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const apiKey = grokKey || openAiKey;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const mode = body.mode || 'sheet';
  const prompt = body.prompt || '';
  const sources = Array.isArray(body.sources) ? body.sources : [];

  if (!apiKey) {
    const offline = offlineExpert(mode, prompt, sources);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: offline, mode, offline: true })
    };
  }

  const userMessage = buildUserMessage(mode, prompt, sources);

  try {
    const base = grokKey ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1';
    const model = grokKey ? (process.env.GROK_MODEL || 'grok-3') : (process.env.OPENAI_MODEL || 'gpt-4o-mini');

    const res = await fetch(`${base}/chat/completions`, {
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

    const data = await res.json();
    if (!res.ok) {
      const offline = offlineExpert(mode, prompt, sources);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          reply: offline,
          mode,
          offline: true,
          apiError: data.error?.message || res.statusText
        })
      };
    }

    const reply = data.choices?.[0]?.message?.content || '';
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply, mode, offline: false })
    };
  } catch (err) {
    const offline = offlineExpert(mode, prompt, sources);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: offline, mode, offline: true, apiError: err.message })
    };
  }
};

function buildUserMessage(mode, prompt, sources) {
  const src = sources.length
    ? `\nSources the student attached:\n${sources.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
    : '';

  const modeHint = {
    sheet: 'Create a complete REVISION SHEET in markdown.',
    plan: 'Create a multi-day REVISION PLAN in markdown.',
    mock: 'Create a full MOCK TEST with questions AND a separate answer key.',
    practice: 'Create a PRACTICE SET with mixed questions and brief answers at the end.',
    flashcards: 'Create FLASHCARDS. Respond with ONLY a valid JSON array of objects with "front" and "back" keys. No markdown fences if possible.'
  }[mode] || 'Help the student study.';

  return `${modeHint}\n\nStudent request:\n${prompt || '(no extra text — invent a solid generic set for common secondary topics)'}\n${src}`;
}

function offlineExpert(mode, prompt, sources) {
  const topic = (prompt || 'your upcoming unit').trim();
  const srcLine = sources.length ? `\n_Sources noted: ${sources.join('; ')}_\n` : '';

  if (mode === 'flashcards') {
    const cards = [
      { front: `What is the core idea of: ${topic}?`, back: 'State the main concept in one precise sentence from memory, then check notes.' },
      { front: `List 3 must-know terms related to ${topic}`, back: 'Write them blank-paper style, then verify definitions.' },
      { front: `Common exam trap for ${topic}?`, back: 'Students mix up similar terms or skip units/conditions — always check the question stem.' },
      { front: `Explain ${topic} to a classmate in 30 seconds`, back: 'If you cannot, that section needs more active recall.' },
      { front: `One formula / rule / verb pattern for ${topic}`, back: 'Write it, cover it, rewrite from memory twice.' },
      { front: `Connect ${topic} to a previous chapter`, back: 'Name the link (cause/effect, contrast, prerequisite).' },
      { front: `Create one exam-style short question on ${topic}`, back: 'Then answer it without looking.' },
      { front: `What would the teacher mark wrong most often here?`, back: 'Incomplete answers, wrong case/tense (languages), missing steps (math).' }
    ];
    return JSON.stringify(cards, null, 2);
  }

  if (mode === 'plan') {
    return `# Revision Plan — ${topic}\n${srcLine}\n## Goal\nArrive at the test date confident via **active recall**, not passive rereading.\n\n## Schedule\n### Day 1 — Map\n- Skim teacher PDF / notes for ${topic}\n- Write a 1-page skeleton: headings only\n- Make 10 flashcards\n\n### Day 2 — Build\n- Fill skeleton from memory first, then fix gaps\n- Practice vocab / formulas 2×\n- 15-minute timed mini-quiz\n\n### Day 3 — Stress test\n- Mixed practice (hard ones first)\n- Mark weak spots\n- Rebuild only weak flashcards\n\n### Day 4 — Polish\n- Light review only\n- Sleep priority\n\n## Rules\n- Fixed teacher **tests** stay on their due date — you only schedule *revision* for them.\n`;
  }

  if (mode === 'mock') {
    return `# Mock Test — ${topic}\n**Time suggestion:** 45–60 minutes\n${srcLine}\n## Part A — Short answers (8 × 2 marks)\n1. Define the central concept of ${topic} in one sentence.\n2. Give two examples that illustrate it.\n3. State one common misconception and correct it.\n4. List key vocabulary / symbols used in this unit.\n5. What prior knowledge does this topic depend on?\n6. Outline the steps to solve a typical problem in this area.\n7. Compare/contrast two related ideas within ${topic}.\n8. Why does this topic matter for the wider subject?\n\n## Part B — Structured (2 × 8 marks)\n9. Explain ${topic} in detail with examples.\n10. Diagnose a typical student error and show the correct approach.\n\n## Part C — Application (1 × 10 marks)\n11. Apply ${topic} to a new scenario. Show reasoning.\n\n---\n\n## Answer key\nPrefer precise, textbook-aligned definitions; award marks for key terms and clear structure.\n`;
  }

  if (mode === 'practice') {
    return `# Practice Set — ${topic}\n${srcLine}\n1. Write everything you remember about **${topic}** in 5 minutes.\n2. Circle gaps. Open notes only for circled items.\n3. Create 5 cloze sentences from your notes.\n4. Solve 3 textbook-style exercises under time pressure.\n5. Teach one sub-idea out loud without notes.\n6. Rephrase key definitions in your own words.\n7. Find one past mistake and rewrite the correct solution.\n8. Rank subtopics weakest → strongest; drill the weakest 10 minutes.\n9. Interleave two subtopics in one session.\n10. Exit ticket: three bullet summary + one remaining question.\n`;
  }

  return `# Revision Sheet — ${topic}\n${srcLine}\n## 1. Big picture\n- What is **${topic}** about in one sentence?\n- Where does it sit in the course?\n\n## 2. Must-know concepts\n| Concept | My definition (from memory) | Check |\n|--------|-----------------------------|-------|\n| Core idea | | ☐ |\n| Key term 1 | | ☐ |\n| Key term 2 | | ☐ |\n| Process / method | | ☐ |\n\n## 3. Details & rules\n- Rule / formula / grammar pattern 1:\n- Rule / formula / grammar pattern 2:\n- Exceptions:\n\n## 4. Worked example\n1. Write a typical question for ${topic}.\n2. Solve without notes.\n3. Compare with notes / mark scheme.\n\n## 5. Common mistakes\n- Mistake A → correct approach:\n- Mistake B → correct approach:\n\n## 6. Active recall prompts\n1. Explain ${topic} without looking.\n2. What would you still get wrong under exam stress?\n3. Link this topic to one earlier unit.\n\n## 7. Quick self-check\n- [ ] I can define every key term blank-paper style\n- [ ] I can do one timed exercise correctly\n- [ ] I know the typical trap questions\n`;
}
