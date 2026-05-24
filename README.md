# TrioZ — Экосистема проектов

Веб-экосистема проектов T.Р.И.О.Z с dark fantasy эстетикой и полной поддержкой светлой/тёмной темы.

## Разделы

| Раздел | Описание |
|--------|----------|
| **Проекты Т.Р.И.О."Z"** | MMORPG, игры, карты, онлайн |
| **Перо Измерений** | Книги, настольные игры, офлайн |
| **TZ.Connect** | Мессенджер с каналами, группами, голосовой связью |
| **TZ.Library** | База знаний, лор, статьи с markdown |
| **Игры** | Вельд'Эран — стратегическая настольная игра с лобби и мультиплеером |
| **AI Ассистент** | Чат с ИИ (OpenAI / Anthropic) |

## Стек технологий

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** + **Framer Motion**
- **Prisma** + PostgreSQL
- **NextAuth.js** (JWT, CredentialsProvider)
- **Socket.io** (real-time мессенджер, WebRTC сигнализация)
- **Redis** (rate limiting, распределённые сессии)
- **AES-256-GCM** шифрование конфигов

## Возможности

- Система друзей (добавление, запросы, принятие/отклонение)
- Группы с каналами (текстовые + голосовые)
- Загрузка аватаров и иконок групп
- Онлайн/оффлайн статусы (heartbeat)
- Голосовые каналы (WebRTC peer-to-peer)
- AI-чат с настраиваемой моделью
- Полная админ-панель (пользователи, контент, баны, роли)
- Светлая/тёмная тема с плавным переключением
- Адаптивный дизайн (desktop + mobile)
- Rate limiting (Redis + in-memory fallback)
- CSP headers для безопасности

## Запуск

### Требования

- Node.js 18+
- PostgreSQL (локально или облачный, например [Neon](https://neon.tech))
- Redis (опционально — без него работает in-memory fallback)

### Установка

```bash
# Клонировать и установить зависимости
git clone https://github.com/acoulbot/trioztest.git
cd trioztest
npm install

# Настроить окружение
cp .env.example .env
# Отредактировать .env — указать DATABASE_URL для PostgreSQL

# Применить миграции и заполнить БД
npx prisma migrate deploy
npm run seed

# Запустить dev-сервер
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

### Docker

```bash
docker compose up -d postgres redis
npx prisma migrate deploy
npm run seed
npm run dev
```

## Переменные окружения

| Переменная | Описание |
|-----------|----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis URL (опционально) |
| `NEXTAUTH_SECRET` | Секрет для JWT |
| `NEXTAUTH_URL` | URL приложения |
| `ENCRYPTION_SECRET` | Ключ шифрования конфигов |
| `ALLOWED_ORIGINS` | CORS origins |
| `TURN_URL` / `TURN_USERNAME` / `TURN_CREDENTIAL` | TURN-сервер для WebRTC |

Полный список — в `.env.example`.

## Демо-доступ

| Роль | Email | Пароль |
|------|-------|--------|
| Админ | admin@trioz.ru | admin123 |
| Пользователь | user@trioz.ru | user123 |

## Админ-панель

Доступна по `/admin` для пользователей с ролью ADMIN:

- Управление пользователями (баны, роли, изменение логинов)
- Управление контентом (статьи, категории)
- Управление услугами и элементами экосистемы
- Настройки AI-моделей и лимитов
- Управление фоновыми окнами

## Структура проекта

```
src/
├── app/
│   ├── api/          # REST API endpoints
│   ├── admin/        # Админ-панель
│   ├── auth/         # Аутентификация
│   ├── connect/      # TZ.Connect мессенджер
│   ├── games/        # Игры (Вельд'Эран)
│   ├── library/      # TZ.Library статьи
│   ├── pero/         # Перо Измерений
│   ├── projects/     # Проекты
│   └── settings/     # Настройки пользователя
├── components/
│   ├── ui/           # UI компоненты (Navbar, GlowAvatar и др.)
│   ├── connect/      # Компоненты мессенджера
│   ├── friends/      # Панель друзей
│   ├── voice/        # Голосовые каналы
│   ├── ai/           # AI-чат
│   └── admin/        # Компоненты админки
├── lib/              # Утилиты (prisma, auth, redis, encryption и др.)
server.ts             # Custom HTTP сервер с Socket.io
prisma/
├── schema.prisma     # Схема БД
├── seed.ts           # Seed данные
└── migrations/       # PostgreSQL миграции
```

## Лицензия

Частный проект. Все права защищены.
