exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GROK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ reply: 'AI backend not configured. Set GROK_API_KEY or OPENAI_API_KEY in Netlify env.' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const base = process.env.GROK_API_KEY ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1';

    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.GROK_API_KEY ? 'grok-beta' : 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a study assistant. Create clear revision sheets, plans, mock tests, or practice questions. Prefer active recall. Output clean markdown.' },
          { role: 'user', content: body.prompt || 'Create a short revision sheet template.' }
        ],
        max_tokens: 1500
      })
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || JSON.stringify(data);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
