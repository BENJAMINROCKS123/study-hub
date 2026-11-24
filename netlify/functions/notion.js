export async function handler(event) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;

  if (!NOTION_TOKEN || !DATABASE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing NOTION_TOKEN or NOTION_DATABASE_ID in Netlify Environment Variables." }),
    };
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_size: 100,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify(data) };
    }

    const tasks = data.results.map((page) => {
      const props = page.properties;
      let title = "Untitled Task";
      let date = null;
      let subject = "General";
      let done = false;

      for (const key in props) {
        const prop = props[key];
        if (prop.type === "title" && prop.title.length > 0) {
          title = prop.title.map((t) => t.plain_text).join("");
        } else if (prop.type === "date" && prop.date) {
          date = prop.date.start.split("T")[0];
        } else if (prop.type === "select" && prop.select) {
          subject = prop.select.name;
        } else if (prop.type === "checkbox") {
          done = prop.checkbox;
        } else if (prop.type === "status" && prop.status) {
          done = prop.status.name.toLowerCase() === "done" || prop.status.name.toLowerCase() === "completed";
        }
      }

      return { id: page.id, title, date, subject, done, url: page.url };
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
