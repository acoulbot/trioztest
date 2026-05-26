# TZ Connect — Редизайн. Инструкция по деплою

## Какие файлы изменились / добавились

| Путь в проекте | Статус | Что изменилось |
|---|---|---|
| `src/app/globals.css` | **ЗАМЕНИТЬ** | CSS-переменные тем: `--cn-*`. Два новых класса `.dark` и `.dark.velvet` |
| `src/contexts/ThemeContext.tsx` | **НОВЫЙ** | Context + хук `useConnectTheme()` для переключения Cyber / Velvet |
| `src/app/connect/page.tsx` | **ЗАМЕНИТЬ** | Новый 3-колоночный layout. `GroupSidebar` → `NavRail` + `GroupListPanel` |
| `src/components/connect/NavRail.tsx` | **НОВЫЙ** | Кол 1: Сообщества / Друзья / Сообщения + кнопка темы + юзер |
| `src/components/connect/GroupListPanel.tsx` | **НОВЫЙ** | Кол 2 (верхний уровень сообществ): список групп |
| `src/components/connect/ChannelSidebar.tsx` | **ЗАМЕНИТЬ** | Убрана user-панель (переехала в NavRail). CSS-переменные вместо хардкода |
| `src/components/connect/MessageArea.tsx` | **ЗАМЕНИТЬ** | Цвета через CSS-переменные темы |
| `src/components/dm/DMPanel.tsx` | **ЗАМЕНИТЬ** | Ширина 240px, цвета через CSS-переменные |
| `src/components/friends/FriendsPanel.tsx` | **ЗАМЕНИТЬ** | Ширина 240px, цвета через CSS-переменные |

## Структура 3 колонок (итог)

```
[NavRail 68px] [Кол 2 — 240px] [Кол 3 — flex]
  Сообщества     → список групп    → выбери канал → чат
  Сообщества     → каналы группы   → чат + ввод
  Друзья         → список друзей   → подсказка
  Сообщения      → DMPanel (сам содержит кол 2+3)
```

## Как переключать тему

Кнопка луны/солнца в нижней части NavRail.
- **Cyber Dark** — чёрный + `#00d4ff` (голубой)
- **Velvet Night** — тёмно-фиолетовый + `#c084fc` (лавандовый)

Тема сохраняется в `localStorage` под ключом `tz-connect-theme`.

## ВАЖНО: старый GroupSidebar

Файл `src/components/connect/GroupSidebar.tsx` больше не используется.
Можно оставить (он не импортируется) или удалить.
