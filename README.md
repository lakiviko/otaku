# Otaku

Персональный каталог фильмов, сериалов, аниме и персон на базе TMDB.
Стек: Next.js (App Router) + server-side proxy для изображений.

## Что уже есть

- Главная `/`: список полок из `data/lists/*.json|*.jsonc`
- Полка `/shelf/:slug`: разделы и тайтлы из твоих списков
- Поиск `/search`: фильмы, сериалы и люди
- Страница тайтла `/title/:type/:id`:
  - метаданные
  - сезоны (для TV)
  - каст (топ)
  - популярные медиа
  - рекомендации
- Страница сезона `/title/tv/:id/season/:seasonNumber`
- Страница каста `/title/:type/:id/cast`
- Страница персоны `/person/:id`

## Формат полок

Файлы лежат в `data/lists`.
Поддерживаются `.json` и `.jsonc` (комментарии и trailing commas в `.jsonc`).

Пример:

```jsonc
{
  "name": "Мое любимое аниме",
  "overview": "Список моего любимого аниме",
  "lists": [
    {
      "name": "Тема 1",
      "overview": "Описание темы 1",
      "items": ["tv/46260", "tv/31910"]
    }
  ]
}
```

`items` сейчас поддерживают ссылки вида `tv/<id>` и `movie/<id>`.

## API (route handlers)

- `GET /api/health`
- `GET /api/search?query=...&language=ru-RU&page=1`
- `GET /api/title/:type/:id?language=ru-RU`
- `GET /api/title/:type/:id/cast?language=ru-RU`
- `GET /api/title/tv/:id/season/:seasonNumber?language=ru-RU`
- `GET /api/person/:id?language=ru-RU`
- `GET /api/image/:size/:path`

## Локальный запуск

1. Установить зависимости:
   - `npm install`
2. Создать `.env`:
   - `TMDB_API_KEY=...`
   - `AUTH_SECRET=...` (длинная случайная строка для подписи auth-cookie)
   - `GITHUB_CLIENT_ID=...` (OAuth App / GitHub App client id)
   - `GITHUB_CLIENT_SECRET=...`
   - `GITHUB_ALLOWED_LOGIN=your-github-login` (кто может войти)
   - `HOST_URI=https://your-domain.example` (опционально: базовый URL для OAuth callback/redirect)
   - `PORT=3000` (опционально)
3. Запустить:
   - `npm run dev`
4. Открыть:
   - `http://localhost:3000`

## Docker

Есть `Dockerfile` для production-сборки Next standalone.

Локальная сборка:

```bash
docker build -t otaku:local .
docker run --rm -p 3000:3000 -e TMDB_API_KEY=... otaku:local
```

## GitHub Actions / GHCR

Workflow: `.github/workflows/build.yml`

Что делает:
- собирает Docker image
- пушит в `ghcr.io/<owner>/<repo>`
- теги: branch, sha, `latest` (для default branch)

Для публикации достаточно пуша в `main`/`master` или ручного запуска workflow.

## Авторизация (только для владельца)

- Вход делается через GitHub OAuth (`/api/auth/github/start`).
- Доступ дается только логинам из `GITHUB_ALLOWED_LOGIN` (или `GITHUB_ALLOWED_LOGINS` через запятую).
- Страница редактора полки `/shelf/:slug/edit` закрыта и требует входа.
