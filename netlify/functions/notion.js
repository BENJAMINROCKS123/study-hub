const { Client } = require('@notionhq/client');

exports.handler = async function () {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID || '3d90bf2cd793809c804fe4ba6e0cad0d';

  if (!token) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ tasks: [], error: 'NOTION_TOKEN not set' })
    };
  }

  try {
    const notion = new Client({ auth: token });
    const dbId = databaseId.includes('-') ? databaseId : databaseId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
    const response = await notion.databases.query({
      database_id: dbId,
      filter: { property: 'Status', status: { does_not_equal: 'Done' } },
      sorts: [{ property: 'Due Date', direction: 'ascending' }],
      page_size: 50
    });

    const tasks = response.results.map(page => {
      const props = page.properties;
      const titleProp = props['Assignment/ Task name'] || props.Name || props.Title;
      const title = titleProp?.title?.map(t => t.plain_text).join('') || 'Untitled';
      const due = props['Due Date']?.date?.start || null;
      const status = props.Status?.status?.name || 'Not started';
      const taskType = props['Task Type']?.select?.name || '';
      const priority = props.Priority?.select?.name || null;
      return { id: page.id, title, due, status, taskType, priority, url: page.url };
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ tasks })
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ tasks: [], error: err.message })
    };
  }
};
