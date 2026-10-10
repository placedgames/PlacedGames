const express = require('express');
const { Telegraf } = require('telegraf');
const cors = require('cors');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { exec } = require('child_process');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 7593972660;

// Сделай два:
const PREVIEW_START_URL = 'https://i.postimg.cc/nzrHcz7L/F7C34F6E-75C4-4087-99AD-67943D3AFC8B.jpg';
const PREVIEW_IMAGE_URL = 'https://i.postimg.cc/K8hvrmSb/6777DAC7-A893-410E-8BB3-72FAB5DB53A8.jpg';

const INVISIBLE_LINK_START = `<a href="${PREVIEW_START_URL}">&#8205;</a>`;
const INVISIBLE_LINK = `<a href="${PREVIEW_IMAGE_URL}">&#8205;</a>`;

// Ссылки на приложение
const APP_URL = 'https://placedgames.up.railway.app/';
const ORDERS_PAGE_URL = `${APP_URL}#orders`;
const REVIEWS_PAGE_URL = `${APP_URL}#reviews`;

// Запрет пересылки сообщений
const NO_FORWARD = { protect_content: true };

console.log('Запуск сервера...');

// Настройка CORS - только доверенные источники
const allowedOrigins = [
    'https://placedgames.up.railway.app',
    'https://placedgames.up.railway.app',
    'http://localhost:3000',
    'http://localhost:5500'
];

function createAdminSessionToken(userId) {
  const payload = JSON.stringify({ userId, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', ADMIN_TOKEN).update(payloadB64).digest('hex');
  return `${payloadB64}.${sig}`;
}

function verifyAdminSessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payloadB64, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', ADMIN_TOKEN).update(payloadB64).digest('hex');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'CORS policy does not allow this origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, max: 120 }));

const path = require('path');
['admin-panel.html', 'products.js'].forEach(f => {
    app.get('/' + f, (req, res) => res.sendFile(path.join(__dirname, f)));
});
// всё содержимое папки index.html/ отдаётся с корня сайта
app.use(express.static(path.join(__dirname, 'index.html')));

// =============================================
// ЗАЩИТА ОТ БРУТФОРСА (по IP)
// =============================================
const loginAttempts = new Map();

// Очистка старых записей каждые 10 минут
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of loginAttempts.entries()) {
        if (now - data.lastAttempt > 30 * 60 * 1000) {
            loginAttempts.delete(ip);
        }
    }
}, 10 * 60 * 1000);

function checkRateLimit(ip) {
    const now = Date.now();
    const data = loginAttempts.get(ip);
    
    if (!data) {
        loginAttempts.set(ip, { count: 1, firstAttempt: now, lastAttempt: now, blockedUntil: null });
        return { allowed: true, remaining: 4 };
    }
    
    if (data.blockedUntil && now < data.blockedUntil) {
        const remainingMinutes = Math.ceil((data.blockedUntil - now) / 60000);
        return { allowed: false, blockedUntil: data.blockedUntil, remainingMinutes };
    }
    
    if (now - data.firstAttempt > 15 * 60 * 1000) {
        loginAttempts.set(ip, { count: 1, firstAttempt: now, lastAttempt: now, blockedUntil: null });
        return { allowed: true, remaining: 4 };
    }
    
    if (data.count >= 5) {
        const blockedUntil = now + 30 * 60 * 1000;
        loginAttempts.set(ip, { ...data, blockedUntil, lastAttempt: now });
        return { allowed: false, blockedUntil, remainingMinutes: 30 };
    }
    
    data.count++;
    data.lastAttempt = now;
    loginAttempts.set(ip, data);
    return { allowed: true, remaining: 5 - data.count };
}

// =============================================
// АДМИН АВТОРИЗАЦИЯ (токен для API)
// =============================================
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!ADMIN_TOKEN || ADMIN_TOKEN.length < 32) {
    console.error('ADMIN_TOKEN не задан или слишком короткий');
    process.exit(1);
}

  function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  const session = verifyAdminSessionToken(token);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  next();
}

// =============================================
// БД
// =============================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// =============================================
// АВТОРИЗАЦИЯ ПОЛЬЗОВАТЕЛЕЙ ЧЕРЕЗ TELEGRAM initData
// =============================================
function verifyInitData(initData) {
    try {
        if (!initData || !BOT_TOKEN) return null;
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) return null;
        params.delete('hash');
        const dcs = Array.from(params.entries())
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([k, v]) => `${k}=${v}`).join('\n');
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
        const expected = crypto.createHmac('sha256', secretKey).update(dcs).digest('hex');
        const a = Buffer.from(hash, 'hex');
        const b = Buffer.from(expected, 'hex');
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
        const authDate = parseInt(params.get('auth_date'));
        if (!authDate || Math.floor(Date.now() / 1000) - authDate > 7 * 86400) return null;
        const user = JSON.parse(params.get('user') || '{}');
        return user && user.id ? user : null;
    } catch (e) { return null; }
}

function userAuth(req, res, next) {
    const user = verifyInitData(req.headers['x-tg-init-data']);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.tgUser = user;
    req.tgUserId = String(user.id);
    next();
}

// админ (Bearer) может смотреть любого пользователя через ?userId=, обычный пользователь — только себя
function userOrAdminAuth(req, res, next) {
    const token = (req.headers.authorization || '').split(' ')[1];
    if (verifyAdminSessionToken(token)) {
        req.isAdmin = true;
        req.tgUserId = String(req.query.userId || '');
        return next();
    }
    return userAuth(req, res, next);
}

function safeUrl(u) {
    return typeof u === 'string' && u.length < 500 && /^https:\/\/[^\s"'<>\\]+$/.test(u) ? u : null;
}

function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function validatePromo(db, code, userId) {
    const upper = String(code || '').toUpperCase().trim();
    if (!upper) return { valid: false, reason: 'not_found' };
    const r = await db.query('SELECT * FROM promo_codes WHERE code = $1 AND active = TRUE', [upper]);
    if (!r.rows.length) return { valid: false, reason: 'not_found' };
    const p = r.rows[0];
    if (p.expires_at && new Date() > new Date(p.expires_at)) return { valid: false, reason: 'expired' };
    if (p.max_uses !== null && p.used_count >= p.max_uses) return { valid: false, reason: 'limit_reached' };
    if (p.user_id && String(p.user_id) !== String(userId)) return { valid: false, reason: 'not_for_you' };
    if (p.type === 'first_order') {
        const c = await db.query('SELECT COUNT(*) AS count FROM orders WHERE user_id = $1', [String(userId)]);
        if (parseInt(c.rows[0].count) > 0) return { valid: false, reason: 'first_order_only' };
    }
    const u = await db.query(
        `SELECT o.status_code FROM promo_usage pu
         LEFT JOIN orders o ON o.id = pu.order_id
         WHERE pu.user_id = $1 AND pu.promo_code = $2`, [String(userId), upper]);
    if (u.rows.length && !u.rows.every(x => x.status_code === 'notfound')) {
        return { valid: false, reason: 'already_used' };
    }
    return { valid: true, discount: p.discount, code: upper };
}


// =============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================

async function getNextOrderNumber() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    
    let attempts = 0;
    while (attempts < 100) {
        const l1 = letters[Math.floor(Math.random() * 26)];
        const d1 = digits[Math.floor(Math.random() * 10)];
        const l2 = letters[Math.floor(Math.random() * 26)];
        const d2 = digits[Math.floor(Math.random() * 10)];
        const code = `${l1}${d1}${l2}${d2}`;
        
        const exists = await pool.query(
            'SELECT id FROM orders WHERE order_number = $1',
            [code]
        );
        if (!exists.rows.length) return code;
        attempts++;
    }
    throw new Error('Не удалось сгенерировать уникальный номер');
}

async function safeDeleteMessage(bot, chatId, messageId) {
    if (!messageId) return;
    try {
        await bot.telegram.deleteMessage(chatId, messageId);
    } catch (e) {
        console.log(`Не удалось удалить сообщение ${messageId}: ${e.message}`);
    }
}

// =============================================
// УВЕДОМЛЕНИЯ АДМИНИСТРАТОРУ
// =============================================

async function notifyAdmin(bot, order) {
        const usernameText = escHtml(order.user_username ? `@${order.user_username}` : (order.user_name || 'Неизвестен'));

    const message =
        `${INVISIBLE_LINK}<b>Новый заказ от ${usernameText}</b>\n\n` +
        `<b>Номер заказа:</b> #${order.order_number}\n` +
        `<b>Сумма заказа:</b> ${order.total}₽\n` +
        `<b>Способ оплаты:</b> ${order.payment_method || 'Не указан'}`;

    const sent = await bot.telegram.sendMessage(ADMIN_ID, message, {
        parse_mode: 'HTML',
        ...NO_FORWARD,
        reply_markup: {
            inline_keyboard: [[
                { text: 'Открыть заказ в приложении', web_app: { url: ORDERS_PAGE_URL } }
            ]]
        }
    });

    return sent.message_id;
}

async function notifyAdminCode(bot, order, code, prevAdminMsgId) {
        const usernameText = escHtml(order.user_username ? `@${order.user_username}` : (order.user_name || 'Неизвестен'));


    await safeDeleteMessage(bot, ADMIN_ID, prevAdminMsgId);

    const message =
        `${INVISIBLE_LINK}<b>Код для заказа от ${usernameText}</b>\n\n` +
        `<b>Номер заказа:</b> #${order.order_number}\n` +
        `<b>Код для входа:</b> ${code}`;

    const sent = await bot.telegram.sendMessage(ADMIN_ID, message, {
        parse_mode: 'HTML',
        ...NO_FORWARD,
        reply_markup: {
            inline_keyboard: [[
                { text: 'Открыть заказ в приложении', web_app: { url: ORDERS_PAGE_URL } }
            ]]
        }
    });

    return sent.message_id;
}

async function notifyAdminReview(bot, userName, userUsername, text) {
        const nick = escHtml(userUsername ? `@${userUsername}` : (userName || 'Неизвестен'));

    const message =
        `${INVISIBLE_LINK}<b>Новый отзыв от ${nick}</b>\n\n` +
        `<b>Текст отзыва:</b>\n${escHtml(text.substring(0, 300))}`;

    await bot.telegram.sendMessage(ADMIN_ID, message, {
        parse_mode: 'HTML',
        ...NO_FORWARD,
        reply_markup: {
            inline_keyboard: [[
                { text: 'Открыть отзыв в приложении', web_app: { url: REVIEWS_PAGE_URL } }
            ]]
        }
    });
}

// Уведомление о новом обращении
async function notifyAdminTicket(bot, ticket) {
    const usernameText = ticket.user_username ? `@${ticket.user_username}` : (ticket.user_name || 'Неизвестен');
    const orderText = ticket.order_id ? `Заказ #${ticket.order_id}` : 'Не указан';

    const message =
        `${INVISIBLE_LINK}<b>🆕 Новое обращение от ${usernameText}</b>\n\n` +
        `<b>Причина:</b> ${ticket.reason || 'Другая проблема'}\n` +
        `<b>Заказ:</b> ${orderText}\n\n` +
        `<b>Текст:</b>\n${ticket.message}`;

    await bot.telegram.sendMessage(ADMIN_ID, message, {
        parse_mode: 'HTML',
        ...NO_FORWARD,
        reply_markup: {
            inline_keyboard: [[
                { text: 'Открыть обращения', web_app: { url: APP_URL + '?tab=tickets' } }
            ]]
        }
    });
}

// =============================================
// УВЕДОМЛЕНИЯ ПОЛЬЗОВАТЕЛЮ
// =============================================

async function notifyUser(bot, order) {
    try {
        const message =
            `${INVISIBLE_LINK}<b>Заказ был успешно создан</b>\n\n` +
            `<b>Номер заказа:</b> #${order.order_number}\n` +
            `<b>Статус:</b> Ожидает проверки`;

        const sent = await bot.telegram.sendMessage(order.user_id, message, {
            parse_mode: 'HTML',
            ...NO_FORWARD,
            reply_markup: {
                inline_keyboard: [[
                    { text: 'Открыть заказ в приложении', web_app: { url: `${APP_URL}?startapp=order_${order.order_number}` } }
                ]]
            }
        });

        return sent.message_id;
    } catch (e) {
        console.error('Не удалось уведомить пользователя:', e.message);
        return null;
    }
}

async function notifyUserStatus(bot, order, status, prevUserMsgId) {
    try {
        await safeDeleteMessage(bot, order.user_id, prevUserMsgId);

        const message =
            `${INVISIBLE_LINK}<b>Обновление статуса заказа</b>\n\n` +
            `<b>Номер заказа:</b> #${order.order_number}\n` +
            `<b>Статус:</b> ${status}`;

        const sent = await bot.telegram.sendMessage(order.user_id, message, {
            parse_mode: 'HTML',
            ...NO_FORWARD,
            reply_markup: {
                inline_keyboard: [[
                    { text: 'Открыть заказ в приложении', web_app: { url: `${APP_URL}?startapp=order_${order.order_number}` } }
               ]]
            }
        });

        return sent.message_id;
    } catch (e) {
        console.error('Не удалось отправить статус пользователю:', e.message);
        return null;
    }
}

// =============================================
// ИНИЦИАЛИЗАЦИЯ БД
// =============================================

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                order_number TEXT UNIQUE,
                date TEXT,
                time TEXT,
                timestamp BIGINT,
                items TEXT,
                total INTEGER,
                promo TEXT,
                promo_discount INTEGER,
                payment_method TEXT,
                sender_name TEXT,
                email TEXT,
                user_id TEXT,
                user_name TEXT,
                status TEXT DEFAULT 'Ожидает проверки',
                status_code TEXT DEFAULT 'pending',
                verification_code TEXT,
                user_username TEXT,
                user_msg_id BIGINT,
                admin_msg_id BIGINT
            )
        `);
        console.log('Таблица orders готова');
        
        const colDefs = [
            'user_username TEXT',
            'verification_code TEXT',
            'user_msg_id BIGINT',
            'admin_msg_id BIGINT'
        ];
        for (const col of colDefs) {
            await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col}`);
        }
        
                await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS game_name TEXT`);
        await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS comment TEXT`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                user_id TEXT,
                user_name TEXT,
                user_username TEXT,
                photo_url TEXT,
                text TEXT,
                stars INTEGER,
                order_id INTEGER,
                order_number TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
                await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id INTEGER`);
        await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_username TEXT`);
        await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS satisfied BOOLEAN DEFAULT TRUE`);
        await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating TEXT`);
        
        await pool.query(`
    CREATE TABLE IF NOT EXISTS referral_earnings (
        id SERIAL PRIMARY KEY,
        referrer_id TEXT,
        referred_user_id TEXT,
        order_id INTEGER,
        amount INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
    )
`);

        await pool.query(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        type TEXT,
        amount INTEGER,
        order_number TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    )
`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                bot_status TEXT DEFAULT 'open',
                work_start TEXT DEFAULT '10:00',
                work_end TEXT DEFAULT '23:59'
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_users (
                id SERIAL PRIMARY KEY,
                user_id TEXT UNIQUE,
                user_name TEXT,
                user_username TEXT,
                photo_url TEXT,
                first_seen TIMESTAMP DEFAULT NOW(),
                last_seen TIMESTAMP DEFAULT NOW()
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS promo_usage (
                id SERIAL PRIMARY KEY,
                user_id TEXT,
                promo_code TEXT,
                order_id INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Таблица для промокодов
        await pool.query(`
    CREATE TABLE IF NOT EXISTS promo_codes (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE,
        discount INTEGER NOT NULL,
        type TEXT DEFAULT 'all',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        user_id TEXT DEFAULT NULL,
        expires_at TIMESTAMP DEFAULT NULL,
        max_uses INTEGER DEFAULT NULL,
        used_count INTEGER DEFAULT 0
    )
`);
await pool.query(`ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT NULL`);
await pool.query(`ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP DEFAULT NULL`);
await pool.query(`ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT NULL`);
await pool.query(`ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0`);

        // Добавляем колонку status для блокировки пользователей
        // Добавляем колонку status для блокировки пользователей
        await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`);
        await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0`);
        await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS referrer_id TEXT DEFAULT NULL`);
        await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS order_block_until BIGINT DEFAULT 0`);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                price INTEGER NOT NULL,
                max_qty INTEGER DEFAULT 1,
                conflict_group TEXT[] DEFAULT '{}',
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

      // Заполняем начальные промокоды
        await pool.query(`
            INSERT INTO promo_codes (code, discount, type) VALUES
                ('GEMSTORM3', 3, 'first_order'),
                ('FUKEVANSND50', 50, 'all'),
                ('WEL9825H0', 1, 'all')
            ON CONFLICT (code) DO NOTHING
        `);

        console.log('Все таблицы готовы');

        const result = await pool.query('SELECT COUNT(*) as count FROM orders');
        console.log(`В базе данных ${result.rows[0].count} заказов`);
    } catch (err) {
        console.error('Ошибка инициализации БД:', err.message);
        throw err;
    }
}

// =============================================
// TELEGRAM BOT
// =============================================

let botInstance = null;

function getBot() {
    if (!BOT_TOKEN) return null;
    if (!botInstance) {
        botInstance = new Telegraf(BOT_TOKEN);

                                  botInstance.start(async (ctx) => {
            try {
                const message =
    `${INVISIBLE_LINK_START}<b>Приветствуем в</b> <b><a href="https://t.me/PlacedGamesBot">Placed Games</a></b>\n\n` +
    `<b><a href="https://t.me/PlacedGamesBot">Placed Games</a></b> - это магазин для <b>покупки</b> доната в <b>разные игры</b>`;
                await ctx.reply(message, {
                    parse_mode: 'HTML',
                    ...NO_FORWARD,
                    reply_markup: {
                        inline_keyboard: [
                           // [
                                //{ text: 'Поддержка', url: 'https://t.me/PlacedHelpBot' },
                                //{ text: 'Наш канал', url: 'https://t.me/PlacedGames' }
                            //],
                            [
                                { text: 'Открыть приложение PlacedGames', web_app: { url: APP_URL } }
                            ]
                        ]
                    }
                });
            } catch (e) {
                console.error('Ошибка /start:', e.message);
            }
        });

        botInstance.launch().catch(err => {
        console.error('Ошибка запуска бота:', err.message);
        });

        process.once('SIGINT', () => botInstance.stop('SIGINT'));
        process.once('SIGTERM', () => botInstance.stop('SIGTERM'));
    }
    return botInstance;
}

// =============================================
// API ЭНДПОИНТЫ
// =============================================

app.get('/api/orders', adminAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users', adminAuth, async (req, res) => {
    try {
        const checkEmpty = await pool.query('SELECT COUNT(*) as count FROM app_users');
        if (parseInt(checkEmpty.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO app_users (user_id, user_name, user_username)
                SELECT user_id, MAX(user_name), MAX(user_username)
                FROM orders WHERE user_id IS NOT NULL
                GROUP BY user_id
                ON CONFLICT (user_id) DO UPDATE SET
                    user_name = EXCLUDED.user_name,
                    user_username = EXCLUDED.user_username
            `);
        }

                const result = await pool.query(`
            SELECT
                au.user_id, au.user_name, au.user_username, au.photo_url,
                au.first_seen, au.last_seen, au.status, au.balance,
                COALESCE(o.orders_count, 0) as orders_count,
                COALESCE(o.total_spent, 0) as total_spent,
                o.first_order_ts
            FROM app_users au
            LEFT JOIN (
                SELECT user_id::TEXT, COUNT(*) as orders_count,
                    COALESCE(SUM(total) FILTER (WHERE status_code IN ('completed', 'done')), 0) as total_spent,
                    MIN("timestamp") as first_order_ts
                FROM orders WHERE user_id IS NOT NULL
                GROUP BY user_id::TEXT
            ) o ON au.user_id::TEXT = o.user_id
            ORDER BY COALESCE(o.total_spent, 0) DESC, au.first_seen DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка /api/users:', err.message);
        res.status(500).json({ error: err.message });
    }
});

const upload = multer({ dest: '/tmp/' });

app.post('/admin/import-db', upload.single('backup'), (req, res) => {
  const secret = req.headers['x-import-secret'];
    if (!process.env.IMPORT_SECRET || secret !== process.env.IMPORT_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  const filepath = req.file.path;
  exec(`pg_restore --clean --if-exists -d "${process.env.DATABASE_URL}" ${filepath}`, (err, stdout, stderr) => {
    if (err) {
      console.error(stderr);
      return res.status(500).send('Ошибка импорта: ' + stderr);
    }
    res.send('Готово! База восстановлена.');
  });
});

// ЗАЩИЩЁННЫЕ ЭНДПОИНТЫ (требуют токен)
app.post('/api/order', userAuth, async (req, res) => {
    const fail = (code, msg) => { const e = new Error(msg); e.status = code; return e; };
    const ALLOWED_PAYMENTS = ['Кошелёк', 'Т-Банк', 'МТС Банк', 'ВТБ Банк', 'Сбер Банк', 'Ozon Банк', 'Альфа Банк'];
    const clip = (v, n) => (v == null ? null : String(v).slice(0, n));
    let saved;
    const client = await pool.connect();
    try {
        const o = req.body || {};
        const tgUser = req.tgUser;
        const userId = req.tgUserId;

        if (!ALLOWED_PAYMENTS.includes(o.payment_method)) throw fail(400, 'Неверный способ оплаты');
        if (!Array.isArray(o.items) || !o.items.length || o.items.length > 6) throw fail(400, 'Некорректный заказ');

        const st = await client.query('SELECT status FROM app_users WHERE user_id = $1', [userId]);
        if (st.rows[0]?.status === 'blocked') throw fail(403, 'blocked');
        if (await isOrderBlocked(client, userId)) throw fail(429, 'too_many_active_orders');

        const ids = o.items.map(i => String(i.id));
        if (new Set(ids).size !== ids.length) throw fail(400, 'Дубли товаров');

        const priceRows = await client.query('SELECT id, price, max_qty FROM products WHERE id = ANY($1)', [ids]);
        const productMap = {};
        priceRows.rows.forEach(r => { productMap[r.id] = r; });

        let promoCode = null, promoDiscount = 0;
        if (o.promo) {
            const pv = await validatePromo(client, o.promo, userId);
            if (!pv.valid) throw fail(400, 'promo_' + pv.reason);
            promoCode = pv.code;
            promoDiscount = pv.discount;
        }

        let realTotal = 0;
        const verifiedItems = [];
        for (const item of o.items) {
            const row = productMap[String(item.id)];
            if (!row) throw fail(400, 'Неизвестный товар: ' + item.id);
            const qty = parseInt(item.qty);
            if (!Number.isInteger(qty) || qty < 1 || qty > (row.max_qty || 1)) throw fail(400, 'Некорректное количество');
            const lineTotal = promoDiscount
                ? Math.round(row.price * qty * (1 - promoDiscount / 100))
                : row.price * qty;
            realTotal += lineTotal;
            verifiedItems.push({ id: item.id, name: clip(item.name, 100), qty, price: lineTotal / qty, originalPrice: row.price });
        }

        const isWallet = o.payment_method === 'Кошелёк';
        const now = new Date();
        const dateStr = now.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' });
        const timeStr = now.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });

        await client.query('BEGIN');

        if (isWallet) {
            const bal = await client.query('SELECT balance FROM app_users WHERE user_id = $1 FOR UPDATE', [userId]);
            if ((bal.rows[0]?.balance || 0) < realTotal) throw fail(400, 'insufficient_balance');
            await client.query('UPDATE app_users SET balance = balance - $1 WHERE user_id = $2', [realTotal, userId]);
        }

        let orderNumber = null;
        if (!isWallet && /^[A-Z][0-9][A-Z][0-9]$/.test(String(o.orderNumber || ''))) {
            const ex = await client.query('SELECT 1 FROM orders WHERE order_number = $1', [o.orderNumber]);
            if (!ex.rows.length) orderNumber = o.orderNumber;
        }
        if (!orderNumber) orderNumber = await getNextOrderNumber();

        if (isWallet) {
            await client.query(
                `INSERT INTO wallet_transactions (user_id, type, amount, order_number) VALUES ($1, $2, $3, $4)`,
                [userId, 'purchase', -realTotal, orderNumber]
            );
        }

        const result = await client.query(
            `INSERT INTO orders (
                order_number, date, time, timestamp, items, total, promo, promo_discount,
                payment_method, sender_name, email, user_id, user_name, user_username,
                game_name, comment, status, status_code
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
            [
                orderNumber, dateStr, timeStr, Date.now(), JSON.stringify(verifiedItems), realTotal,
                promoCode, promoDiscount, o.payment_method,
                clip(o.sender_name, 100), clip(o.email, 100),
                userId, clip(tgUser.first_name, 100), clip(tgUser.username, 64),
                clip(o.game_name, 50), clip(o.comment, 300),
                isWallet ? 'Ожидает выполнения' : 'Ожидает проверки',
                isWallet ? 'processing' : 'pending'
            ]
        );
        saved = result.rows[0];

        if (promoCode) {
            const upd = await client.query(
                `UPDATE promo_codes SET used_count = used_count + 1
                 WHERE code = $1 AND (max_uses IS NULL OR used_count < max_uses)`, [promoCode]);
            if (!upd.rowCount) throw fail(400, 'promo_limit_reached');
            await client.query(
                'INSERT INTO promo_usage (user_id, promo_code, order_id) VALUES ($1, $2, $3)',
                [userId, promoCode, saved.id]
            );
        }

        await client.query('COMMIT');
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (e) {}
        if (!err.status) console.error('Ошибка создания заказа:', err.message);
        return res.status(err.status || 500).json({ error: err.status ? err.message : 'Ошибка создания заказа' });
    } finally {
        client.release();
    }

    console.log(`Заказ #${saved.order_number} сохранён`);

        res.json({ success: true, orderId: saved.id });

    try {
        let userMsgId = null, adminMsgId = null;
        const bot = getBot();
        if (bot) {
            if (saved.user_id) userMsgId = await notifyUser(bot, saved);
            adminMsgId = await notifyAdmin(bot, saved);
        }
        if (userMsgId !== null || adminMsgId !== null) {
            await pool.query('UPDATE orders SET user_msg_id = $1, admin_msg_id = $2 WHERE id = $3',
                [userMsgId, adminMsgId, saved.id]);
        }
    } catch (e) {
        console.error('Ошибка уведомлений:', e.message);
    }
});

app.get('/api/total-revenue', adminAuth, async (req, res) => {
    try {
        const result = await pool.query(`SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE status_code IN ('completed', 'done')`);
        res.json({ revenue: parseInt(result.rows[0].revenue) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/orders/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const del = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING user_id', [id]);
        if (del.rows[0]) await releaseOrderBlockIfFree(pool, del.rows[0].user_id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/reviews/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/status', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM orders');
        res.json({ status: 'ok', bot: !!BOT_TOKEN, ordersCount: parseInt(result.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/user-orders', userOrAdminAuth, async (req, res) => {
    try {
        const userId = req.tgUserId;
        if (!userId) return res.json([]);
        const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC', [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/update-status', adminAuth, async (req, res) => {
    try {
        const { orderId, status, statusCode } = req.body;

        const orderBefore = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
        if (!orderBefore.rows.length) return res.status(404).json({ error: 'Заказ не найден' });
        const prev = orderBefore.rows[0];

        let finalStatusCode = statusCode;
        if (!finalStatusCode) {
            const statusMap = {
    'Ожидание проверки': 'pending',
    'Ожидает проверки': 'pending',
    'Проверка перевода': 'pending',
    'Ожидание кода': 'awaiting_code',
    'Ожидает выполнения': 'processing',
    'Выполняется': 'in_progress',   // ← добавить
    'Выполнен': 'completed',
    'Заказ выполнен': 'completed',
    'Отменён': 'cancelled',
    'done': 'completed',
    'notfound': 'cancelled'
};
            for (const [key, value] of Object.entries(statusMap)) {
                if (status === key || status.includes(key)) {
                    finalStatusCode = value;
                    break;
                }
            }
        }

        console.log(`Обновление заказа #${prev.order_number}: статус="${status}" → status_code="${finalStatusCode}"`);

        const result = await pool.query(
            'UPDATE orders SET status=$1, status_code=$2 WHERE id=$3 RETURNING *',
            [status, finalStatusCode, orderId]
        );

                const order = result.rows[0];
        const isCompleted = finalStatusCode === 'completed' || finalStatusCode === 'done';
        const wasCompleted = prev.status_code === 'completed' || prev.status_code === 'done';
        await releaseOrderBlockIfFree(pool, order.user_id);

                                if (isCompleted && !wasCompleted && order.user_id && order.payment_method !== 'Кошелёк') {
    const cashback = Math.round(order.total * 0.02);
    if (cashback > 0) {
        await pool.query(`
            INSERT INTO app_users (user_id, balance) VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET balance = app_users.balance + $2
        `, [String(order.user_id), cashback]);

        await pool.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, order_number) VALUES ($1, $2, $3, $4)`,
            [String(order.user_id), 'cashback_own', cashback, order.order_number]
        );
    }

    // Начисление рефереру
    const buyer = await pool.query('SELECT referrer_id FROM app_users WHERE user_id = $1', [String(order.user_id)]);
    const referrerId = buyer.rows[0]?.referrer_id;
    if (referrerId) {
        const referralBonus = Math.round(order.total * 0.02);
        if (referralBonus > 0) {
            await pool.query(`
                INSERT INTO app_users (user_id, balance) VALUES ($1, $2)
                ON CONFLICT (user_id) DO UPDATE SET balance = app_users.balance + $2
            `, [referrerId, referralBonus]);

            await pool.query(`
                INSERT INTO referral_earnings (referrer_id, referred_user_id, order_id, amount)
                VALUES ($1, $2, $3, $4)
            `, [referrerId, String(order.user_id), order.id, referralBonus]);

            await pool.query(
                `INSERT INTO wallet_transactions (user_id, type, amount, order_number) VALUES ($1, $2, $3, $4)`,
                [referrerId, 'cashback_referral', referralBonus, order.order_number]
            );
        }
    }
}

        if (order.user_id && finalStatusCode !== 'pending') {
            const bot = getBot();
            if (bot) {
                const newUserMsgId = await notifyUserStatus(bot, order, status, prev.user_msg_id);
                await pool.query(
                    'UPDATE orders SET user_msg_id = $1 WHERE id = $2',
                    [isCompleted ? null : newUserMsgId, orderId]
                );
            }
        }

        res.json({ success: true, order: order });
    } catch (err) {
        console.error('Ошибка update-status:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/submit-code', userAuth, async (req, res) => {
    try {
        const orderId = parseInt(req.body.orderId);
        const code = String(req.body.code || '').replace(/\D/g, '').slice(0, 12);
        if (!Number.isInteger(orderId) || !code) return res.status(400).json({ error: 'Некорректные данные' });

        const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [orderId, req.tgUserId]);
        if (!orderResult.rows.length) return res.status(404).json({ error: 'Заказ не найден' });
        const prev = orderResult.rows[0];
        if (prev.status_code !== 'awaiting_code') return res.status(400).json({ error: 'Код сейчас не требуется' });

        const result = await pool.query(
            'UPDATE orders SET verification_code = $1, status = $2, status_code = $3 WHERE id = $4 RETURNING *',
            [code, 'Ожидает выполнения', 'processing', orderId]
        );

        if (!result.rows.length) return res.status(404).json({ error: 'Заказ не найден' });
        const order = result.rows[0];

        const bot = getBot();
        if (bot) {
            const newUserMsgId = await notifyUserStatus(bot, order, 'Ожидает выполнения', prev.user_msg_id);
            const newAdminMsgId = await notifyAdminCode(bot, order, code, prev.admin_msg_id);
            await pool.query(
                'UPDATE orders SET user_msg_id = $1, admin_msg_id = $2 WHERE id = $3',
                [newUserMsgId, newAdminMsgId, orderId]
            );
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/refresh-order', userOrAdminAuth, async (req, res) => {
    try {
        const { orderId, orderNumber } = req.body;
        let result;
        if (orderId) {
            result = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
        } else if (orderNumber) {
            result = await pool.query('SELECT * FROM orders WHERE order_number = $1', [String(orderNumber)]);
        } else {
            return res.status(400).json({ error: 'Нет данных' });
        }
        if (!result.rows.length) return res.status(404).json({ error: 'Заказ не найден' });
        const order = result.rows[0];

        if (req.isAdmin || String(order.user_id) === req.tgUserId) return res.json(order);

        // чужой заказ: только выполненный и без личных данных
        if (order.status_code !== 'completed' && order.status_code !== 'done') {
            return res.status(403).json({ error: 'Недоступно' });
        }
        res.json({
            ...order,
            user_id: '0', email: null, sender_name: null, payment_method: null,
            verification_code: null, user_name: null, user_username: null,
            promo: order.promo ? '***' : null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/track-user', userAuth, async (req, res) => {
    try {
        const u = req.tgUser;
        const userId = req.tgUserId;
        const { referrerId } = req.body;

        let validReferrer = null;
        if (referrerId && String(referrerId) !== userId) {
            const refCheck = await pool.query('SELECT 1 FROM app_users WHERE user_id = $1', [String(referrerId)]);
            if (refCheck.rows.length) validReferrer = String(referrerId);
        }

        await pool.query(`
            INSERT INTO app_users (user_id, user_name, user_username, photo_url, referrer_id, last_seen)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                user_name = EXCLUDED.user_name,
                user_username = EXCLUDED.user_username,
                photo_url = EXCLUDED.photo_url,
                last_seen = NOW()
        `, [userId, String(u.first_name || '').slice(0, 100) || null, u.username || null, safeUrl(u.photo_url), validReferrer]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/referral-stats', userOrAdminAuth, async (req, res) => {
    try {
        const userId = req.tgUserId;
        if (!userId) return res.json({ invited: 0, invited24h: 0, earned: 0, earned24h: 0 });

        const invited = await pool.query(
            'SELECT COUNT(*) c FROM app_users WHERE referrer_id = $1', [String(userId)]
        );
        const invited24h = await pool.query(
            `SELECT COUNT(*) c FROM app_users WHERE referrer_id = $1 AND first_seen >= NOW() - INTERVAL '24 hours'`,
            [String(userId)]
        );
        const earned = await pool.query(
            'SELECT COALESCE(SUM(amount),0) s FROM referral_earnings WHERE referrer_id = $1', [String(userId)]
        );
        const lastEarning = await pool.query(
            `SELECT amount FROM referral_earnings WHERE referrer_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [String(userId)]
        );

        res.json({
            invited: parseInt(invited.rows[0].c),
            invited24h: parseInt(invited24h.rows[0].c),
            earned: Math.round(earned.rows[0].s),
            earned24h: lastEarning.rows[0] ? Math.round(lastEarning.rows[0].amount) : 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/referral-list', userOrAdminAuth, async (req, res) => {
    try {
        const userId = req.tgUserId;
        const { limit } = req.query;
        if (!userId) return res.json([]);
        const limitNum = Math.min(parseInt(limit) || 5, 1000);

        const result = await pool.query(`
            SELECT
                au.user_id,
                au.user_name,
                au.user_username,
                au.first_seen,
                COALESCE(re.earned, 0) as earned
            FROM app_users au
            LEFT JOIN (
                SELECT referred_user_id, SUM(amount) as earned
                FROM referral_earnings
                WHERE referrer_id = $1
                GROUP BY referred_user_id
            ) re ON re.referred_user_id = au.user_id
            WHERE au.referrer_id = $1
            ORDER BY au.first_seen DESC
            LIMIT $2
        `, [String(userId), limitNum]);

        const list = result.rows.map(r => {
            const item = {
                nickname: r.user_name || 'Пользователь',
                earned: Math.round(r.earned || 0)
            };
            // id реферала отдаём только админу (для перехода на страницу пользователя)
            if (req.isAdmin) {
                item.user_id = r.user_id;
                item.user_username = r.user_username;
            }
            return item;
        });

        res.json(list);
    } catch (err) {
        console.error('Ошибка /api/referral-list:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ПУБЛИЧНАЯ ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ (для карточки профиля)
app.get('/api/user-info', userOrAdminAuth, async (req, res) => {
    try {
        const userId = req.tgUserId;
        if (!userId) return res.status(400).json({ error: 'Нет userId' });
        const result = await pool.query(
            'SELECT user_id, user_name, user_username, first_seen FROM app_users WHERE user_id = $1',
            [String(userId)]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Не найден' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/user-balance', userOrAdminAuth, async (req, res) => {
    try {
        const userId = req.tgUserId;
        if (!userId) return res.json({ balance: 0 });
        const result = await pool.query('SELECT balance FROM app_users WHERE user_id = $1', [String(userId)]);
        res.json({ balance: result.rows[0]?.balance || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/wallet-transactions', userOrAdminAuth, async (req, res) => {
    try {
        const userId = req.tgUserId;
        const { limit } = req.query;
        if (!userId) return res.json([]);
        const limitNum = Math.min(parseInt(limit) || 5, 1000);
        const result = await pool.query(
            'SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
            [String(userId), limitNum]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/wallet-transactions/:id', adminAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM wallet_transactions WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ПРОВЕРКА СТАТУСА ПОЛЬЗОВАТЕЛЯ (публичный)
app.get('/api/user-status', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.json({ status: 'active' });
        const result = await pool.query('SELECT status FROM app_users WHERE user_id = $1', [userId]);
        res.json({ status: result.rows[0]?.status || 'active' });
    } catch (err) {
        res.json({ status: 'active' });
    }
});

app.post('/api/migrate-users', adminAuth, async (req, res) => {
    try {
        await pool.query(`
            INSERT INTO app_users (user_id, user_name, user_username)
            SELECT DISTINCT ON (user_id) user_id, user_name, user_username
            FROM orders WHERE user_id IS NOT NULL
            ON CONFLICT (user_id) DO UPDATE SET
                user_name = EXCLUDED.user_name,
                user_username = EXCLUDED.user_username
        `);
        const count = await pool.query('SELECT COUNT(*) as count FROM app_users');
        res.json({ success: true, users: parseInt(count.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/debug-users', adminAuth, async (req, res) => {
    try {
        const appUsers = await pool.query('SELECT COUNT(*) as count FROM app_users');
        const orders = await pool.query('SELECT COUNT(DISTINCT user_id) as count FROM orders WHERE user_id IS NOT NULL');
        const sample = await pool.query('SELECT user_id, user_name FROM orders WHERE user_id IS NOT NULL LIMIT 3');
        res.json({
            app_users_count: parseInt(appUsers.rows[0].count),
            orders_unique_users: parseInt(orders.rows[0].count),
            sample_order_users: sample.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/check-promo', userAuth, async (req, res) => {
    try {
        const r = await validatePromo(pool, req.body.code, req.tgUserId);
        res.json(r.valid ? { valid: true, discount: r.discount } : { valid: false, reason: r.reason });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ЛИМИТ АКТИВНЫХ ЗАКАЗОВ
const ACTIVE_ORDER_LIMIT = 2;               // при 2 активных заказах третий нельзя
const ORDER_BLOCK_MS = 60 * 60 * 1000;      // блокировка на 1 час

async function countActiveOrders(db, userId) {
    const r = await db.query(
        `SELECT COUNT(*) AS c FROM orders
         WHERE user_id = $1 AND status_code NOT IN ('completed', 'done', 'cancelled', 'notfound')`,
        [String(userId)]
    );
    return parseInt(r.rows[0].c);
}

// true = оформлять нельзя; при достижении лимита запускает блокировку на час
async function isOrderBlocked(db, userId) {
    const uid = String(userId);
    const b = await db.query('SELECT order_block_until FROM app_users WHERE user_id = $1', [uid]);
    const until = Number(b.rows[0]?.order_block_until || 0);
    if (Date.now() < until) return true;
    if ((await countActiveOrders(db, uid)) >= ACTIVE_ORDER_LIMIT) {
        await db.query('UPDATE app_users SET order_block_until = $1 WHERE user_id = $2', [Date.now() + ORDER_BLOCK_MS, uid]);
        return true;
    }
    return false;
}

// снимает блокировку, если активных заказов стало меньше лимита
async function releaseOrderBlockIfFree(db, userId) {
    if (!userId) return;
    if ((await countActiveOrders(db, userId)) < ACTIVE_ORDER_LIMIT) {
        await db.query('UPDATE app_users SET order_block_until = 0 WHERE user_id = $1', [String(userId)]);
    }
}

app.get('/api/check-rate-limit', userAuth, async (req, res) => {
    try {
        res.json({ limited: await isOrderBlocked(pool, req.tgUserId) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ПОЛУЧИТЬ ПОЛЬЗОВАТЕЛЯ ПО ID (админ)
app.get('/api/user/:userId', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const userResult = await pool.query(`
            SELECT au.*, 
                COALESCE(o.orders_count, 0) as orders_count,
                COALESCE(o.total_spent, 0) as total_spent
            FROM app_users au
            LEFT JOIN (
                SELECT user_id::TEXT, COUNT(*) as orders_count,
                    COALESCE(SUM(total) FILTER (WHERE status_code IN ('completed', 'done')), 0) as total_spent
                FROM orders WHERE user_id IS NOT NULL GROUP BY user_id::TEXT
            ) o ON au.user_id::TEXT = o.user_id
            WHERE au.user_id = $1
        `, [userId]);
        if (!userResult.rows.length) return res.status(404).json({ error: 'Не найден' });
        res.json(userResult.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/user/:userId/balance', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { amount } = req.body;
        const amt = parseInt(amount);
        if (isNaN(amt) || amt === 0) return res.status(400).json({ error: 'Некорректная сумма' });
        const result = await pool.query(`
            INSERT INTO app_users (user_id, balance) VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET balance = app_users.balance + $2
            RETURNING balance
        `, [String(userId), amt]);

        await pool.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, order_number) VALUES ($1, $2, $3, $4)`,
            [String(userId), 'admin_topup', amt, null]
        );

        res.json({ success: true, balance: result.rows[0].balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ИЗМЕНИТЬ СТАТУС ПОЛЬЗОВАТЕЛЯ (админ)
app.post('/api/user/:userId/status', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;
        await pool.query('UPDATE app_users SET status = $1 WHERE user_id = $2', [status, userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sync-products', adminAuth, async (req, res) => {
    try {
        const { products } = req.body; // [{id, price, maxQty, conflictGroup}]
        if (!Array.isArray(products) || !products.length) {
            return res.status(400).json({ error: 'Пустой список товаров' });
        }
        for (const p of products) {
            await pool.query(`
                INSERT INTO products (id, price, max_qty, conflict_group, updated_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    price = EXCLUDED.price,
                    max_qty = EXCLUDED.max_qty,
                    conflict_group = EXCLUDED.conflict_group,
                    updated_at = NOW()
            `, [p.id, p.price, p.maxQty || 1, p.conflictGroup || []]);
        }
        res.json({ success: true, count: products.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================
// ЭНДПОИНТЫ ДЛЯ УПРАВЛЕНИЯ ПРОМОКОДАМИ (АДМИН)
// =============================================

// Получить все промокоды
app.get('/api/promo-codes', adminAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM promo_codes ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Добавить промокод
app.post('/api/promo-codes', adminAuth, async (req, res) => {
    try {
        const { code, discount, type, userId, expiresAt, maxUses } = req.body;
        if (!code || discount === undefined) {
            return res.status(400).json({ error: 'Код и скидка обязательны' });
        }
        await pool.query(
            `INSERT INTO promo_codes (code, discount, type, user_id, expires_at, max_uses) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                code.toUpperCase(),
                parseInt(discount),
                type || 'all',
                userId || null,
                expiresAt || null,
                maxUses ? parseInt(maxUses) : null
            ]
        );
        res.json({ success: true });
    } catch (err) {
        if (err.code === '23505') {
            res.status(400).json({ error: 'Промокод с таким названием уже существует' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// Деактивировать промокод
app.delete('/api/promo-codes/:id', adminAuth, async (req, res) => {
    try {
        await pool.query('UPDATE promo_codes SET active = FALSE WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Активировать промокод
app.post('/api/promo-codes/:id/activate', adminAuth, async (req, res) => {
    try {
        await pool.query('UPDATE promo_codes SET active = TRUE WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Удалить промокод (полностью)
app.delete('/api/promo-codes/:id/delete', adminAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM promo_codes WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================
// АДМИН: СТАТИСТИКА МАГАЗИНА, ВСЕ ОПЕРАЦИИ КОШЕЛЬКОВ, ОТЗЫВЫ
// =============================================

// Информация о магазине (алерт на странице профиля)
app.get('/api/admin/store-stats', adminAuth, async (req, res) => {
    try {
        const [users, refs, orders, wallets] = await Promise.all([
            pool.query('SELECT COUNT(*) AS c FROM app_users'),
            pool.query('SELECT COUNT(*) AS c FROM app_users WHERE referrer_id IS NOT NULL'),
            pool.query(`
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status_code IN ('completed', 'done')) AS completed,
                    COALESCE(SUM(total) FILTER (WHERE status_code IN ('completed', 'done')), 0) AS revenue
                FROM orders
            `),
            pool.query('SELECT COALESCE(SUM(balance), 0) AS s FROM app_users')
        ]);
        const total = parseInt(orders.rows[0].total);
        const completed = parseInt(orders.rows[0].completed);
        res.json({
            users: parseInt(users.rows[0].c),
            referrals: parseInt(refs.rows[0].c),
            revenue: parseInt(orders.rows[0].revenue),
            orders: total,
            completed,
            uncompleted: total - completed,
            walletsTotal: parseInt(wallets.rows[0].s)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Все операции всех кошельков + суммарный баланс (страница «Кошелёк» в админке)
app.get('/api/admin/wallet-transactions', adminAuth, async (req, res) => {
    try {
        const limitNum = Math.min(parseInt(req.query.limit) || 5, 1000);
        const [tx, total] = await Promise.all([
            pool.query(`
                SELECT wt.*, au.user_name, au.user_username
                FROM wallet_transactions wt
                LEFT JOIN app_users au ON au.user_id = wt.user_id
                ORDER BY wt.created_at DESC, wt.id DESC
                LIMIT $1
            `, [limitNum]),
            pool.query('SELECT COALESCE(SUM(balance), 0) AS s FROM app_users')
        ]);
        res.json({ total: parseInt(total.rows[0].s), transactions: tx.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Отзывы без лимита в 50 штук; можно фильтровать по пользователю или заказу
app.get('/api/admin/reviews', adminAuth, async (req, res) => {
    try {
        const where = [];
        const params = [];
        if (req.query.userId) { params.push(String(req.query.userId)); where.push(`r.user_id = $${params.length}`); }
        if (req.query.orderId) { params.push(parseInt(req.query.orderId)); where.push(`r.order_id = $${params.length}`); }
        const result = await pool.query(`
            SELECT r.*, o.items as order_items, o.game_name as order_game_name
            FROM reviews r
            LEFT JOIN orders o ON o.order_number = r.order_number
            ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
            ORDER BY r.created_at DESC
            LIMIT 1000
        `, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================
// НАСТРОЙКИ
// =============================================

app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings WHERE id = 1');
        if (!result.rows.length) {
            res.json({ bot_status: 'open', work_start: '10:00', work_end: '23:59' });
        } else {
            res.json(result.rows[0]);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', adminAuth, async (req, res) => {
    try {
        const { bot_status } = req.body;
        await pool.query(`
            INSERT INTO settings (id, bot_status) VALUES (1, $1)
            ON CONFLICT (id) DO UPDATE SET bot_status = $1
        `, [bot_status]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================
// РЕЙТИНГ И ОТЗЫВЫ
// =============================================

app.get('/api/reviews', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, o.items as order_items, o.game_name as order_game_name
            FROM reviews r
            LEFT JOIN orders o ON o.order_number = r.order_number
            ORDER BY r.created_at DESC LIMIT 50
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reviews', userAuth, async (req, res) => {
    try {
        const { text, rating, orderId } = req.body;
        const u = req.tgUser;
        const clean = String(text || '').trim().slice(0, 70);
        const oid = parseInt(orderId);
        if (clean.length < 3 || !Number.isInteger(oid)) return res.status(400).json({ error: 'Некорректные данные' });

        const ord = await pool.query('SELECT id, order_number, status_code FROM orders WHERE id = $1 AND user_id = $2', [oid, req.tgUserId]);
        if (!ord.rows.length) return res.status(404).json({ error: 'Заказ не найден' });
        if (!['completed', 'done'].includes(ord.rows[0].status_code)) return res.status(400).json({ error: 'Заказ не выполнен' });
        const dup = await pool.query('SELECT 1 FROM reviews WHERE order_id = $1', [oid]);
        if (dup.rows.length) return res.status(400).json({ error: 'Отзыв уже оставлен' });

        const ratingVal = rating === 'bad' ? 'bad' : 'good';
        const userName = String(u.first_name || 'Пользователь').slice(0, 100);

        await pool.query(
            `INSERT INTO reviews (user_id, user_name, user_username, photo_url, text, satisfied, rating, order_id, order_number)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [req.tgUserId, userName, u.username || null, safeUrl(u.photo_url), clean, ratingVal !== 'bad', ratingVal, oid, ord.rows[0].order_number]
        );

        const bot = getBot();
        if (bot) {
            try { await notifyAdminReview(bot, userName, u.username, clean); }
            catch (e) { console.error('Ошибка уведомления об отзыве:', e.message); }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================
// АДМИН ВЕРИФИКАЦИЯ TELEGRAM
// =============================================
app.post('/api/admin/verify-telegram', async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ success: false });

    const crypto = require('crypto');
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (hash !== expectedHash) {
      return res.status(403).json({ success: false, reason: 'invalid_signature' });
    }

    const authDate = parseInt(params.get('auth_date'));
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      return res.status(403).json({ success: false, reason: 'expired' });
    }

    const user = JSON.parse(params.get('user') || '{}');
    if (user.id !== 7593972660) {
      return res.status(403).json({ success: false, reason: 'not_admin' });
    }

        const sessionToken = createAdminSessionToken(user.id);

    res.json({ success: true, sessionToken });

  } catch(e) {
    console.error('Ошибка верификации Telegram:', e.message);
    res.status(500).json({ success: false });
  }
});

process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));
process.on('uncaughtException', (e) => console.error('uncaughtException:', e));
// =============================================
// ЗАПУСК
// =============================================
initDB().then(async () => {
    try {
        await pool.query(`
            INSERT INTO app_users (user_id, user_name, user_username)
            SELECT user_id::TEXT, MAX(user_name), MAX(user_username)
            FROM orders WHERE user_id IS NOT NULL
            GROUP BY user_id::TEXT
            ON CONFLICT (user_id) DO UPDATE SET
                user_name = EXCLUDED.user_name,
                user_username = EXCLUDED.user_username
        `);
        const count = await pool.query('SELECT COUNT(*) as count FROM app_users');
        console.log(`app_users после миграции: ${count.rows[0].count} пользователей`);
    } catch (e) {
        console.error('Ошибка автомиграции:', e.message);
    }

    if (BOT_TOKEN) {
        getBot();
        console.log('Telegram бот запущен');
    } else {
        console.warn('BOT_TOKEN не установлен, бот не запущен');
    }

    app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
}).catch((err) => {
    console.error('Ошибка Базы:', err.message);
    process.exit(1);
});