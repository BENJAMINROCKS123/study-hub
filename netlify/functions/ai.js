export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing GEMINI_API_KEY in Netlify Environment Variables." }),
    };
  }

  try {
    const { mode, today, tasks, pdfText } = JSON.parse(event.body);
    let prompt = "";

    if (mode === "plan_day") {
      prompt = `You are a smart student study planner. Today's date is ${today}.
Here is the student's current Notion task & exam list (JSON):
${JSON.stringify(tasks, null, 2)}

CRITICAL SCHEDULING RULES:
1. FIXED TESTS/EXAMS: Any item that is a Test, Exam, Quiz, Klausur, Klassenarbeit, or Assessment has a FIXED date set by the teacher (its "date" field). NEVER tell the student to "do" or "take" a test early—only note upcoming tests as fixed milestones on their exact due dates.
2. REVISION TASKS ("Üben" / "revise"): Tasks containing "Üben", "üben", "revise", "Revise", or "revision" are study/practice tasks preparing for those fixed tests. Prioritize spreading/doing these in the days leading up to the corresponding test!
3. REGULAR HOMEWORK: Other non-test tasks should be prioritized by nearest due date (and overdue items first).
4. OUTPUT FORMAT: Return ONLY valid JSON with this exact structure (no markdown fences):
{
  "summary": "1-2 sentence overview of today's workload and nearest fixed test.",
  "upcomingTests": [
    { "title": "Test name", "date": "YYYY-MM-DD", "daysLeft": 3 }
  ],
  "todayPlan": [
    {
      "priority": "High" | "Medium" | "Low",
      "task": "Exact task name or specific 'Üben/Revise for [Test]' action",
      "reason": "Short reason based on due date or upcoming fixed test",
      "suggestedMinutes": 30
    }
  ]
}`;
    } else if (mode === "generate_cards") {
      prompt = `Convert the following teacher PDF notes into high-yield Active Recall flashcards (both Q&A and Cloze deletion).
Return ONLY valid JSON as an array of objects (no markdown fences):
[
  { "type": "basic", "front": "Clear question", "back": "Concise answer", "tag": "Topic" },
  { "type": "cloze", "front": "Sentence with {{c1::key term}} hidden", "back": "key term", "tag": "Topic" }
]

PDF TEXT:
${pdfText.slice(0, 12000)}`;
    }

    const response = await fetch(
      `https://generativativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify(data) };
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: rawText,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
