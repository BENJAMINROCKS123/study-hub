const { Client } = require('@notionhq/client');

function getClient() {
  const token = process.env.NOTION_TOKEN;
  if (!token) return null;
  return new Client({ auth: token });
}

function normalizeDbId(id) {
  if (!id) return '3d90bf2c-d793-809c-804f-e4ba6e0cad0d';
  if (id.includes('-')) return id;
  return id.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const notion = getClient();
  const databaseId = normalizeDbId(process.env.NOTION_DATABASE_ID);
  if (!notion) {
    return res.status(200).json({ tasks: [], error: 'NOTION_TOKEN not set on server' });
  }

  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (body.action === 'mark_done' && body.pageId) {
        await notion.pages.update({
          page_id: body.pageId,
          properties: { Status: { status: { name: 'Done' } } }
        });
        return res.status(200).json({ ok: true, pageId: body.pageId });
      }
      if (body.action === 'mark_undone' && body.pageId) {
        await notion.pages.update({
          page_id: body.pageId,
          properties: { Status: { status: { name: 'Not started' } } }
        });
        return res.status(200).json({ ok: true, pageId: body.pageId });
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ property: 'Due Date', direction: 'ascending' }],
      page_size: 100
    });

    const tasks = response.results.map(page => {
      const props = page.properties;
      const titleProp = props['Assignment/ Task name'] || props.Name || props.Title;
      const title = titleProp?.title?.map(t => t.plain_text).join('') || 'Untitled';
      const due = props['Due Date']?.date?.start || null;
      const status = props.Status?.status?.name || 'Not started';
      const taskType = props['Task Type']?.select?.name || '';
      const priority = props.Priority?.select?.name || null;
      return {
        id: page.id,
        title,
        due,
        status,
        taskType,
        priority,
        url: page.url,
        done: status === 'Done'
      };
    });
    return res.status(200).json({ tasks });
  } catch (err) {
    return res.status(200).json({ tasks: [], error: err.message });
  }
};
