# StudyHub v2

Dark/light study OS with Notion Assignments sync, checkboxes that mark **Done** in Notion, and an expert AI for revision sheets / plans / mocks / flashcards.

## Repo
https://github.com/BENJAMINROCKS123/study-hub

## Features
- Login / Sign up / Forgot password + **Continue with Google** (demo Google session for personal use)
- Profile chip (Benjamin Yu · benjaminyu747@gmail.com) + theme toggle + **Log out**
- Task list & calendar **checkboxes** → local save + Notion `Status = Done` via function
- Plan My Day rules: no tests unless due today; Üben/revise allowed
- AI: Netlify function with Grok/OpenAI, plus strong offline expert generator
- Flashcards: manual, AI generate, Quizlet (export paste), paste import

## Netlify env
- `NOTION_TOKEN`
- `NOTION_DATABASE_ID` = `3d90bf2c-d793-809c-804f-e4ba6e0cad0d`
- `GROK_API_KEY` or `OPENAI_API_KEY` (optional but recommended for live AI)

Share the Notion database with your integration.
