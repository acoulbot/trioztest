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

---

## Установка на пустой сервер (Ubuntu/Debian)

> Все команды выполняются от root. Порт по умолчанию — **3005** (можно изменить).

### 1. Подготовка системы

```bash
apt update && apt upgrade -y
apt install -y curl git build-essential
```

### 2. Установка Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v && npm -v
```

### 3. Установка PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

sudo -u postgres psql -c "CREATE USER trioz WITH PASSWORD 'trioz_secret';"
sudo -u postgres psql -c "CREATE DATABASE trioz OWNER trioz;"
```

### 4. Установка Redis (опционально)

```bash
apt install -y redis-server
systemctl start redis-server
systemctl enable redis-server
redis-cli ping
```

> Без Redis проект работает с in-memory fallback для rate limiting.

### 5. Клонирование и установка

```bash
cd /root
git clone https://github.com/acoulbot/trioztest.git
cd trioztest
npm install
```

### 6. Настройка .env

```bash
cat > .env << 'EOF'
# ─── Database ────────────────────────────────────────────────────────
DATABASE_URL="postgresql://trioz:trioz_secret@localhost:5432/trioz"

# ─── Redis ───────────────────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ─── NextAuth ────────────────────────────────────────────────────────
NEXTAUTH_URL="http://YOUR_SERVER_IP:3005"
NEXTAUTH_SECRET="СГЕНЕРИРУЙТЕ_КОМАНДОЙ_НИЖЕ"

# ─── Security ────────────────────────────────────────────────────────
ENCRYPTION_SECRET="СГЕНЕРИРУЙТЕ_КОМАНДОЙ_НИЖЕ"
ALLOWED_ORIGINS="http://YOUR_SERVER_IP:3005"

# ─── Port ────────────────────────────────────────────────────────────
PORT=3005

# ─── TURN Server (голосовые каналы, опционально) ─────────────────────
TURN_URL=""
TURN_USERNAME=""
TURN_CREDENTIAL=""

# ─── SMTP (email, опционально) ───────────────────────────────────────
SMTP_HOST=""
SMTP_PORT=587
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM=""
EOF
```

**Сгенерировать секреты:**

```bash
NEXTAUTH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_SECRET=$(openssl rand -base64 32)
sed -i "s|NEXTAUTH_SECRET=\"СГЕНЕРИРУЙТЕ_КОМАНДОЙ_НИЖЕ\"|NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"|" .env
sed -i "s|ENCRYPTION_SECRET=\"СГЕНЕРИРУЙТЕ_КОМАНДОЙ_НИЖЕ\"|ENCRYPTION_SECRET=\"$ENCRYPTION_SECRET\"|" .env
```

**Заменить IP сервера:**

```bash
SERVER_IP=$(curl -s ifconfig.me)
sed -i "s|YOUR_SERVER_IP|$SERVER_IP|g" .env
```

**Проверить .env:**

```bash
cat .env
```

### 7. Миграции и seed

```bash
npx prisma migrate deploy
npm run seed
```

### 8. Сборка

```bash
npx next build
```

### 9. Запуск (PM2 — рекомендуется)

```bash
npm install -g pm2

pm2 start npm --name "trioz" -- start
pm2 save
pm2 startup
```

**Проверить:**

```bash
pm2 status
curl http://localhost:3005
```

**Полезные команды PM2:**

```bash
pm2 logs trioz          # Логи
pm2 restart trioz       # Перезапуск
pm2 stop trioz          # Остановить
pm2 delete trioz        # Удалить из PM2
```

### 10. Настройка Nginx (проксирование домена)

```bash
apt install -y nginx
```

```bash
cat > /etc/nginx/sites-available/trioz << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
EOF
```

```bash
ln -sf /etc/nginx/sites-available/trioz /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

**SSL (Let's Encrypt):**

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d YOUR_DOMAIN
```

После SSL обновите `.env`:

```bash
sed -i "s|http://|https://|g" .env
pm2 restart trioz
```

---

## Установка через Docker (альтернатива)

### 1. Установка Docker

```bash
apt update
apt install -y curl
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker
```

### 2. Установка Docker Compose

```bash
apt install -y docker-compose-plugin
docker compose version
```

### 3. Клонирование

```bash
cd /root
git clone https://github.com/acoulbot/trioztest.git
cd trioztest
```

### 4. Настройка .env

```bash
cat > .env << 'EOF'
# ─── Docker Compose ─────────────────────────────────────────────────
POSTGRES_USER=trioz
POSTGRES_PASSWORD=trioz_secret
POSTGRES_DB=trioz

# ─── App ─────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://trioz:trioz_secret@postgres:5432/trioz"
REDIS_URL="redis://redis:6379"
NEXTAUTH_URL="http://YOUR_SERVER_IP:3005"
NEXTAUTH_SECRET="СГЕНЕРИРУЙТЕ_КОМАНДОЙ_НИЖЕ"
ENCRYPTION_SECRET="СГЕНЕРИРУЙТЕ_КОМАНДОЙ_НИЖЕ"
ALLOWED_ORIGINS="http://YOUR_SERVER_IP:3005"
PORT=3005
EOF
```

```bash
NEXTAUTH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_SECRET=$(openssl rand -base64 32)
sed -i "s|NEXTAUTH_SECRET=\"СГЕНЕРИРУЙТЕ_КОМАНДОЙ_НИЖЕ\"|NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"|" .env
sed -i "s|ENCRYPTION_SECRET=\"СГЕНЕРИРУЙТЕ_КОМАНДОЙ_НИЖЕ\"|ENCRYPTION_SECRET=\"$ENCRYPTION_SECRET\"|" .env
SERVER_IP=$(curl -s ifconfig.me)
sed -i "s|YOUR_SERVER_IP|$SERVER_IP|g" .env
```

### 5. Изменить порт в docker-compose.yml

```bash
sed -i 's/"3000:3000"/"3005:3005"/' docker-compose.yml
```

### 6. Запуск

```bash
docker compose up -d
```

**Дождаться запуска PostgreSQL и применить миграции:**

```bash
sleep 10
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run seed
```

**Проверить:**

```bash
docker compose ps
curl http://localhost:3005
```

**Полезные команды Docker:**

```bash
docker compose logs -f app      # Логи приложения
docker compose restart app      # Перезапуск
docker compose down             # Остановить всё
docker compose up -d --build    # Пересобрать и запустить
```

---

## Остановка и удаление проекта

### PM2

```bash
pm2 stop trioz
pm2 delete trioz
rm -rf /root/trioztest
```

### Docker

```bash
cd /root/trioztest
docker compose down -v    # -v удалит и данные БД
rm -rf /root/trioztest
```

### Убить процесс на порту (если запущен без PM2/Docker)

```bash
kill -9 $(lsof -t -i:3005) 2>/dev/null
```

---

## Обновление

### PM2

```bash
cd /root/trioztest
git pull
npm install
npx prisma migrate deploy
npx next build
pm2 restart trioz
```

### Docker

```bash
cd /root/trioztest
git pull
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
```

---

## Переменные окружения

| Переменная | Описание | Обязательна |
|-----------|----------|:-----------:|
| `DATABASE_URL` | PostgreSQL connection string | да |
| `NEXTAUTH_SECRET` | Секрет для JWT | да |
| `NEXTAUTH_URL` | URL приложения | да |
| `ENCRYPTION_SECRET` | Ключ шифрования конфигов | да |
| `PORT` | Порт сервера (по умолчанию 3000) | нет |
| `REDIS_URL` | Redis URL | нет |
| `ALLOWED_ORIGINS` | CORS origins | нет |
| `TURN_URL` | TURN-сервер для WebRTC | нет |
| `TURN_USERNAME` | TURN логин | нет |
| `TURN_CREDENTIAL` | TURN пароль | нет |
| `SMTP_HOST` | SMTP сервер | нет |
| `SMTP_PORT` | SMTP порт | нет |
| `SMTP_USER` | SMTP логин | нет |
| `SMTP_PASSWORD` | SMTP пароль | нет |
| `SMTP_FROM` | Адрес отправителя | нет |

## Демо-доступ

| Роль | Email | Пароль |
|------|-------|--------|
| Админ | admin@trioz.ru | admin123 |
| Пользователь | user@trioz.ru | user123 |

---

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
