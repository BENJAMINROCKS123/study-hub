# StudyHub

Dark-mode AI study hub with Notion Assignments & Tasks sync.

## Features
- Left index sidebar (Home, Calendar, Flashcards, Revision, Plan My Day, Settings)
- Black + purple (+ indigo) theme
- **Plan My Day**: uses Notion due dates. Never schedules tests unless due today. Allows Üben / revise tasks any day.
- AI chat: revision sheets, plans, mock tests, practice — file/link attachments + PDF download
- Calendar day boxes show homework / revision / fixed tests
- Flashcards: manual, AI, Quizlet link, paste import + active recall study

## Deploy (Netlify + GitHub)
1. This repo is on GitHub: https://github.com/BENJAMINROCKS123/study-hub
2. Import site on Netlify (from GitHub)
3. Environment variables:
   - `NOTION_TOKEN` — Notion integration secret
   - `NOTION_DATABASE_ID` — `3d90bf2c-d793-809c-804f-e4ba6e0cad0d`
   - Optional: `GROK_API_KEY` or `OPENAI_API_KEY` for real AI
4. Share the Notion database with your integration

## Local
Open `index.html` or any static server. Sync falls back to demo tasks (seeded from your real Notion list).
