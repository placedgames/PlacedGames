const express = require('express');
const { Telegraf } = require('telegraf');
const cors = require('cors');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { execFile } = require('child_process');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 7593972660;
const ORDER_STATUS_CODES = ['pending', 'awaiting_code', 'processing', 'in_progress', 'completed', 'done', 'cancelled', 'notfound'];
const PROMO_TYPES = ['all', 'first_order'];

function safeEqualStr(a, b) {
    const x = Buffer.from(String(a));
    const y = Buffer.from(String(b));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function sendServerError(res, err) {
    if (err && err.code === '23505') return res.status(400).json({ error: 'Такая запись уже существует' });
    console.error('Ошибка сервера:', err && err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}

const PREVIEW_START_URL = 'https://i.postimg.cc/nzrHcz7L/F7C34F6E-75C4-4087-99AD-67943D3AFC8B.jpg';
const PREVIEW_IMAGE_URL = 'https://i.postimg.cc/K8hvrmSb/6777DAC7-A893-410E-8BB3-72FAB5DB53A8.jpg';

const INVISIBLE_LINK_START = `<a href="${PREVIEW_START_URL}">&#8205;</a>`;
const INVISIBLE_LINK = `<a href="${PREVIEW_IMAGE_URL}">&#8205;</a>`;

const APP_URL = 'https://placedgames.up.railway.app/';
const ORDERS_PAGE_URL = `${APP_URL}#orders`;
const REVIEWS_PAGE_URL = `${APP_URL}#reviews`;

const ADMIN_PANEL_URL = `${APP_URL}admin-panel.html`;
const adminOrderUrl = (num) => `${ADMIN_PANEL_URL}?page=order&number=${encodeURIComponent(String(num))}`;
const ADMIN_REVIEWS_URL = `${ADMIN_PANEL_URL}?page=reviews`;
const adminChatUrl = (userId) => `${ADMIN_PANEL_URL}?page=chat&user=${encodeURIComponent(String(userId))}`;

const NO_FORWARD = { protect_content: true };

console.log('Запуск сервера...');

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
    if (!sig || !safeEqualStr(sig, expectedSig)) return null;
    try {
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
        if (Date.now() > payload.exp || Number(payload.userId) !== ADMIN_ID) return null;
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
app.disable('x-powered-by');
app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        next();
});
app.use(express.json({ limit: '100kb' }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, max: 120 }));

const path = require('path');
['admin-panel.html', 'products.js'].forEach(f => {
        app.get('/' + f, (req, res) => res.sendFile(path.join(__dirname, f)));
});

app.use(express.static(path.join(__dirname, 'index.html')));

const loginAttempts = new Map();

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

const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.PGSSL_ROOT_CERT
        ? { ca: process.env.PGSSL_ROOT_CERT }
        : { rejectUnauthorized: false }
});

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
    const disc = parseInt(p.discount);
    if (!Number.isInteger(disc) || disc < 1 || disc > 100) return { valid: false, reason: 'not_found' };
    return { valid: true, discount: disc, code: upper };
}

function generateOrderNumber() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < 3; i++) {
        code += letters[crypto.randomInt(26)] + digits[crypto.randomInt(10)];
    }
    return code;
}

async function getNextOrderNumber() {
    let attempts = 0;
    while (attempts < 100) {
        const code = generateOrderNumber();
        const exists = await pool.query(
            'SELECT id FROM orders WHERE order_number = $1',
            [code]
        );
        if (!exists.rows.length) return code;
        attempts++;
    }
    throw new Error('Не удалось сгенерировать уникальный номер');
}

function shortOrderNumber(n) {
    return String(n || '').slice(0, 4);
}

async function safeDeleteMessage(bot, chatId, messageId) {
    if (!messageId) return;
    try {
        await bot.telegram.deleteMessage(chatId, messageId);
    } catch (e) {
        console.log(`Не удалось удалить сообщение ${messageId}: ${e.message}`);
    }
}

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
                        { text: 'Открыть заказ в приложении', web_app: { url: adminOrderUrl(order.order_number) } }
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
                        { text: 'Открыть заказ в приложении', web_app: { url: adminOrderUrl(order.order_number) } }
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
                        { text: 'Открыть отзыв в приложении', web_app: { url: ADMIN_REVIEWS_URL } }
                ]]
            }
    });
}

async function notifyAdminTicket(bot, ticket) {
    const usernameText = escHtml(ticket.user_username ? `@${ticket.user_username}` : (ticket.user_name || 'Неизвестен'));
    const orderText = ticket.order_id ? `Заказ #${ticket.order_id}` : 'Не указан';

    const message =
    `${INVISIBLE_LINK}<b>🆕 Новое обращение от ${usernameText}</b>\n\n` +
    `<b>Причина:</b> ${escHtml(ticket.reason || 'Другая проблема')}\n` +
    `<b>Заказ:</b> ${orderText}\n\n` +
    `<b>Текст:</b>\n${escHtml(ticket.message)}`;

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

async function notifyUser(bot, order) {
    try {
        const message =
        `${INVISIBLE_LINK}<b>Заказ был успешно создан</b>\n\n` +
        `<b>Номер заказа:</b> #${shortOrderNumber(order.order_number)}\n` +
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

        await logBotMessage(order.user_id, 'out', 'text',
            `Заказ был успешно создан\n\nНомер заказа: #${order.order_number}\nСтатус: Ожидает проверки`,
            null, null, null, sent.message_id);
        return sent.message_id;
    } catch (e) {
        console.error('Не удалось уведомить пользователя:', e.message);
        return null;
    }
}

async function notifyUserStatus(bot, order, status, prevUserMsgId) {
    try {
        await safeDeleteMessage(bot, order.user_id, prevUserMsgId);
        await unlogBotMessage(order.user_id, prevUserMsgId);

        const message =
        `${INVISIBLE_LINK}<b>Обновление статуса заказа</b>\n\n` +
        `<b>Номер заказа:</b> #${shortOrderNumber(order.order_number)}\n` +
        `<b>Статус:</b> ${escHtml(status)}`;

        const sent = await bot.telegram.sendMessage(order.user_id, message, {
                parse_mode: 'HTML',
                ...NO_FORWARD,
                reply_markup: {
                    inline_keyboard: [[
                            { text: 'Открыть заказ в приложении', web_app: { url: `${APP_URL}?startapp=order_${order.order_number}` } }
                    ]]
                }
        });

        await logBotMessage(order.user_id, 'out', 'text',
            `Обновление статуса заказа\n\nНомер заказа: #${order.order_number}\nСтатус: ${status}`,
            null, null, null, sent.message_id);
        return sent.message_id;
    } catch (e) {
        console.error('Не удалось отправить статус пользователю:', e.message);
        return null;
    }
}

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
        await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS reviews_order_id_unique ON reviews(order_id) WHERE order_id IS NOT NULL`)
        .catch(e => console.error('Индекс отзывов не создан (возможны дубли):', e.message));

        await pool.query(`
            CREATE TABLE IF NOT EXISTS bot_messages (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                direction TEXT NOT NULL,
                kind TEXT NOT NULL,
                text TEXT,
                file_id TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS bot_messages_user_id_id ON bot_messages(user_id, id)`)
        .catch(e => console.error('Индекс сообщений бота не создан:', e.message));

        await pool.query(`ALTER TABLE bot_messages ADD COLUMN IF NOT EXISTS thumb_id TEXT`);
        await pool.query(`ALTER TABLE bot_messages ADD COLUMN IF NOT EXISTS meta TEXT`);

        await pool.query(`ALTER TABLE bot_messages ADD COLUMN IF NOT EXISTS tg_message_id BIGINT`);
        await pool.query(`ALTER TABLE bot_messages ADD COLUMN IF NOT EXISTS edited BOOLEAN NOT NULL DEFAULT FALSE`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS bot_support_state (
                user_id TEXT PRIMARY KEY,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        const readsTable = await pool.query(`SELECT to_regclass('bot_chat_reads') AS t`);
        const readsExisted = !!(readsTable.rows[0] && readsTable.rows[0].t);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bot_chat_reads (
                user_id TEXT PRIMARY KEY,
                last_read_id INTEGER NOT NULL DEFAULT 0
            )
        `);
        if (!readsExisted) {

            await pool.query(`
                INSERT INTO bot_chat_reads (user_id, last_read_id)
                SELECT user_id, MAX(id) FROM bot_messages GROUP BY user_id
                ON CONFLICT (user_id) DO NOTHING
            `).catch(e => console.error('Не удалось проставить прочитанные чаты:', e.message));
        }

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

        await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`);
        await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0`);
        await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS referrer_id TEXT DEFAULT NULL`);
        await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS ref_code TEXT`);
        await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_users_ref_code_unique ON app_users(ref_code) WHERE ref_code IS NOT NULL`)
        .catch(e => console.error('Индекс ref_code не создан:', e.message));
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

        await pool.query(`
            DELETE FROM promo_codes
            WHERE code IN ('GEMSTORM3', 'FUKEVANSND50', 'WEL9825H0')
        `);
        await pool.query(`
            INSERT INTO promo_codes (code, discount, type) VALUES
                ('FIRSTORDER', 3, 'first_order')
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

const BOT_TEXT_MAX = 4000;

async function logBotMessage(userId, direction, kind, text, fileId, thumbId, meta, tgMessageId) {
    try {
        const clipped = text == null ? null : String(text).slice(0, BOT_TEXT_MAX);
        const metaStr = meta ? JSON.stringify(meta).slice(0, 500) : null;
        const r = await pool.query(
            `INSERT INTO bot_messages (user_id, direction, kind, text, file_id, thumb_id, meta, tg_message_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, user_id, direction, kind, text, (thumb_id IS NOT NULL) AS has_thumb, meta, created_at`,
            [String(userId), direction, kind, clipped, fileId || null, thumbId || null, metaStr, tgMessageId || null]
        );
        return r.rows[0];
    } catch (e) {
        console.error('Не удалось сохранить сообщение бота:', e.message);
        return null;
    }
}

async function unlogBotMessage(userId, tgMessageId) {
    if (!tgMessageId) return;
    try {
        await pool.query(
            `DELETE FROM bot_messages WHERE user_id = $1 AND direction = 'out' AND tg_message_id = $2`,
            [String(userId), tgMessageId]
        );
    } catch (e) {
        console.error('Не удалось убрать сообщение из переписки:', e.message);
    }
}

async function upsertBotUser(from) {
    try {
        await pool.query(
            `INSERT INTO app_users (user_id, user_name, user_username, last_seen)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (user_id) DO UPDATE SET
                user_name = EXCLUDED.user_name,
                user_username = COALESCE(EXCLUDED.user_username, app_users.user_username),
                last_seen = NOW()`,
            [String(from.id), String(from.first_name || 'Пользователь').slice(0, 100), from.username || null]
        );
    } catch (e) {
        console.error('Не удалось обновить пользователя бота:', e.message);
    }
}

let botInstance = null;

function getBot() {
    if (!BOT_TOKEN) return null;
    if (!botInstance) {
        botInstance = new Telegraf(BOT_TOKEN);

        botInstance.start(async (ctx) => {
                try {

                    if (ctx.from) await pool.query(`DELETE FROM bot_support_state WHERE user_id = $1`, [String(ctx.from.id)]).catch(() => {});

                    try {
                        if (ctx.chat && ctx.chat.type === 'private' && ctx.from && ctx.from.id !== ADMIN_ID) {
                            await upsertBotUser(ctx.from);
                            const startText = (ctx.message && typeof ctx.message.text === 'string' && ctx.message.text) || '/start';
                            await logBotMessage(String(ctx.from.id), 'in', 'text', startText, null, null, null, ctx.message && ctx.message.message_id);
                        }
                    } catch (e) {
                        console.error('Ошибка логирования /start:', e.message);
                    }
                    const message =
                    `${INVISIBLE_LINK_START}<b>Приветствуем в</b> <b><a href="https://t.me/PlacedGamesBot">Placed Games</a></b>\n\n` +
                    `<b><a href="https://t.me/PlacedGamesBot">Placed Games</a></b> - это магазин для <b>покупки</b> доната в <b>разные игры</b>`;
                    const startSent = await ctx.reply(message, {
                            parse_mode: 'HTML',
                            ...NO_FORWARD,
                            reply_markup: {
                                inline_keyboard: [

                                    [
                                        { text: 'Открыть приложение PlacedGames', web_app: { url: APP_URL } }
                                    ]
                                ]
                            }
                    });
                    await logBotMessage(String(ctx.from.id), 'out', 'text', 'Приветствуем в Placed Games\n\nPlaced Games - это магазин для покупки доната в разные игры', null, null, null, startSent && startSent.message_id);
                } catch (e) {
                    console.error('Ошибка /start:', e.message);
                }
        });

        botInstance.on('message', async (ctx, next) => {
                try {
                    const chat = ctx.chat;
                    const from = ctx.from;
                    const msg = ctx.message || {};
                    if (!chat || chat.type !== 'private' || !from || from.id === ADMIN_ID) return next();

                    let kind = null;
                    let text = null;
                    let fileId = null;
                    let thumbId = null;
                    let meta = null;
                    const thumbOf = (o) => {
                        const t = o && (o.thumbnail || o.thumb);
                        return t && t.file_id ? t.file_id : null;
                    };
                    const isCommand = typeof msg.text === 'string' && msg.text.startsWith('/');
                    if (typeof msg.text === 'string') {
                        kind = 'text';
                        text = msg.text;
                    } else if (Array.isArray(msg.photo) && msg.photo.length) {
                        const largest = msg.photo.reduce((a, b) => ((b.width * b.height) > (a.width * a.height) ? b : a));
                        kind = 'photo';
                        text = msg.caption || null;
                        fileId = largest.file_id;
                        meta = { w: largest.width, h: largest.height };
                    } else if (msg.animation) {
                        kind = 'animation';
                        text = msg.caption || null;
                        fileId = msg.animation.file_id;
                        thumbId = thumbOf(msg.animation);
                        meta = { w: msg.animation.width, h: msg.animation.height, d: msg.animation.duration };
                    } else if (msg.video) {
                        kind = 'video';
                        text = msg.caption || null;
                        fileId = msg.video.file_id;
                        thumbId = thumbOf(msg.video);
                        meta = { w: msg.video.width, h: msg.video.height, d: msg.video.duration, size: msg.video.file_size };
                    } else if (msg.video_note) {
                        kind = 'video_note';
                        fileId = msg.video_note.file_id;
                        thumbId = thumbOf(msg.video_note);
                        meta = { w: msg.video_note.length, h: msg.video_note.length, d: msg.video_note.duration, size: msg.video_note.file_size };
                    } else if (msg.voice) {
                        kind = 'voice';
                        fileId = msg.voice.file_id;
                        meta = { d: msg.voice.duration, size: msg.voice.file_size };
                    } else if (msg.sticker) {
                        kind = 'sticker';
                        fileId = msg.sticker.file_id;
                        thumbId = thumbOf(msg.sticker);
                        meta = {
                            w: msg.sticker.width, h: msg.sticker.height,
                            anim: !!msg.sticker.is_animated, vid: !!msg.sticker.is_video,
                            emoji: msg.sticker.emoji || null
                        };
                    }

                    if (kind) {
                        await upsertBotUser(from);
                        await logBotMessage(String(from.id), 'in', kind, text, fileId, thumbId, meta, msg.message_id);
                    }

                    const userId = String(from.id);
                    const command = isCommand ? msg.text.trim().split(/[\s@]/)[0].toLowerCase() : null;

                    if (command === '/support') {
                        await pool.query(
                            `INSERT INTO bot_support_state (user_id, created_at) VALUES ($1, NOW())
                         ON CONFLICT (user_id) DO UPDATE SET created_at = NOW()`, [userId]);
                        const prompt = 'Здравствуйте! Опишите, пожалуйста, вашу проблему, и мы соединим вас с оператором. Вы также можете прикрепить фото или видео размером до 20 МБ.';
                        const sent = await ctx.reply(prompt, { ...NO_FORWARD });
                        await logBotMessage(userId, 'out', 'text', prompt, null, null, null, sent && sent.message_id);
                        return;
                    }

                    if (!isCommand && (kind === 'text' || kind === 'photo' || kind === 'video')) {
                        const pending = await pool.query(
                            `DELETE FROM bot_support_state
                         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
                         RETURNING user_id`, [userId]);
                        if (pending.rows.length) {
                            const accepted = 'Принято! Оператор ответит вам в ближайшее время (обычно это занимает не более 20 минут).';
                            const sent = await ctx.reply(accepted, { ...NO_FORWARD });
                            await logBotMessage(userId, 'out', 'text', accepted, null, null, null, sent && sent.message_id);

                            const body = text && text.trim() ? text.trim().slice(0, 1000) : (kind === 'video' ? 'Видео' : 'Фото');
                            await ctx.telegram.sendMessage(ADMIN_ID,
                                `${INVISIBLE_LINK}<b>Получено новое обращение</b>\n\n<b>Текст обращения:</b>\n${escHtml(body)}`,
                                {
                                    parse_mode: 'HTML',
                                    ...NO_FORWARD,
                                    reply_markup: {
                                        inline_keyboard: [[
                                                { text: 'Открыть чат в приложении', web_app: { url: adminChatUrl(userId) } }
                                        ]]
                                    }
                            });
                        }
                    }
                } catch (e) {
                    console.error('Ошибка обработки сообщения бота:', e.message);
                }
                return next();
        });

        botInstance.on('edited_message', async (ctx, next) => {
                try {
                    const msg = ctx.editedMessage || (ctx.update && ctx.update.edited_message);
                    const from = ctx.from;
                    if (msg && ctx.chat && ctx.chat.type === 'private' && from && from.id !== ADMIN_ID) {
                        const newText = typeof msg.text === 'string' ? msg.text : (msg.caption || null);
                        const upd = await pool.query(
                            `UPDATE bot_messages SET text = $3, edited = TRUE
                         WHERE user_id = $1 AND direction = 'in' AND tg_message_id = $2`,
                            [String(from.id), msg.message_id, newText ? String(newText).slice(0, BOT_TEXT_MAX) : null]
                        );
                        console.log(`Изменено сообщение ${msg.message_id} пользователя ${from.id}, обновлено записей: ${upd.rowCount}`);
                    }
                } catch (e) {
                    console.error('Ошибка обработки изменённого сообщения:', e.message);
                }
                return next();
        });

        const botUpdateTypes = ['message', 'edited_message', 'callback_query', 'my_chat_member'];
        botInstance.launch({ allowedUpdates: botUpdateTypes, polling: { allowedUpdates: botUpdateTypes } }).catch(err => {
                console.error('Ошибка запуска бота:', err.message);
        });

        process.once('SIGINT', () => botInstance.stop('SIGINT'));
        process.once('SIGTERM', () => botInstance.stop('SIGTERM'));
    }
    return botInstance;
}

app.get('/api/orders', adminAuth, async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
            res.json(result.rows);
        } catch (err) {
            sendServerError(res, err);
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
            sendServerError(res, err);
        }
});

const upload = multer({ dest: '/tmp/', limits: { fileSize: 200 * 1024 * 1024, files: 1 } });

function requireImportEnabled(req, res, next) {
    if (process.env.ENABLE_DB_IMPORT !== 'true') return res.status(403).json({ error: 'Импорт базы отключён' });
    const secret = String(req.headers['x-import-secret'] || '');
    const expected = String(process.env.IMPORT_SECRET || '');
    if (!expected || !safeEqualStr(secret, expected)) return res.status(401).send('Unauthorized');
    next();
}

let pendingImport = null;

setInterval(() => {
        if (pendingImport && Date.now() - pendingImport.createdAt > 15 * 60 * 1000) {
            fs.unlink(pendingImport.path, () => {});
            console.log('Запрос на импорт БД отменён по таймауту');
            pendingImport = null;
        }
    }, 60 * 1000);

app.post('/admin/import-db', requireImportEnabled, upload.single('backup'), (req, res) => {
        if (!req.file) return res.status(400).send('Файл не передан');
        if (pendingImport) {
            fs.unlink(req.file.path, () => {});
            return res.status(409).send('Уже есть запрос на импорт, ожидающий подтверждения администратора');
        }
        pendingImport = {
            id: crypto.randomBytes(8).toString('hex'),
            path: req.file.path,
            originalName: String(req.file.originalname || '').slice(0, 100),
            size: req.file.size,
            createdAt: Date.now()
        };
        console.log(`Получен бэкап БД (${req.file.size} байт), ожидает подтверждения администратора`);
        res.status(202).json({ pending: true, requestId: pendingImport.id });
});

function runPendingImport(res) {
    const job = pendingImport;
    pendingImport = null;
    res.send('Импорт запущен. Результат будет в логах сервера.');
    execFile('pg_restore', ['--clean', '--if-exists', '-d', process.env.DATABASE_URL, job.path],
        { timeout: 10 * 60 * 1000 },
        (err, stdout, stderr) => {
            fs.unlink(job.path, () => {});
            if (err) console.error('Ошибка pg_restore:', stderr);
            else console.log('Восстановление базы завершено');
    });
}

app.get('/api/admin/import-requests', adminAuth, (req, res) => {
        res.json({
                pending: !!pendingImport,
                requestId: pendingImport ? pendingImport.id : null,
                originalName: pendingImport ? pendingImport.originalName : null,
                size: pendingImport ? pendingImport.size : null,
                createdAt: pendingImport ? pendingImport.createdAt : null
        });
});

app.post('/api/admin/import-requests/:id/approve', adminAuth, (req, res) => {
        if (!pendingImport || pendingImport.id !== req.params.id) return res.status(404).json({ error: 'Запрос не найден' });
        runPendingImport(res);
});

app.post('/api/admin/import-requests/:id/decline', adminAuth, (req, res) => {
        if (!pendingImport || pendingImport.id !== req.params.id) return res.status(404).json({ error: 'Запрос не найден' });
        fs.unlink(pendingImport.path, () => {});
        console.log('Запрос на импорт БД отклонён администратором');
        pendingImport = null;
        res.json({ success: true });
});

app.post('/api/order', userAuth, async (req, res) => {
        const fail = (code, msg) => { const e = new Error(msg); e.status = code; return e; };
        const ALLOWED_PAYMENTS = ['Кошелёк', 'Т-Банк', 'МТС Банк', 'ВТБ Банк', 'Сбер Банк', 'Ozon Банк', 'Альфа Банк'];
        const clip = (v, n) => (v == null ? null : String(v).slice(0, n));
        let saved;
        let client = null;
        try {
            client = await pool.connect();
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
            if (!isWallet && /^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$/.test(String(o.orderNumber || ''))) {
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
            if (client) client.release();
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
            sendServerError(res, err);
        }
});

app.delete('/api/orders/:id', adminAuth, async (req, res) => {
        try {
            const { id } = req.params;
            const del = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING user_id', [id]);
            if (del.rows[0]) await releaseOrderBlockIfFree(pool, del.rows[0].user_id);
            res.json({ success: true });
        } catch (err) {
            sendServerError(res, err);
        }
});

app.delete('/api/reviews/:id', adminAuth, async (req, res) => {
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
            res.json({ success: true });
        } catch (err) {
            sendServerError(res, err);
        }
});

app.get('/api/status', async (req, res) => {
        try {
            const result = await pool.query('SELECT COUNT(*) as count FROM orders');
            res.json({ status: 'ok', bot: !!BOT_TOKEN, ordersCount: parseInt(result.rows[0].count) });
        } catch (err) {
            sendServerError(res, err);
        }
});

app.get('/api/user-orders', userOrAdminAuth, async (req, res) => {
        try {
            const userId = req.tgUserId;
            if (!userId) return res.json([]);
            const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC', [userId]);
            res.json(result.rows);
        } catch (err) {
            sendServerError(res, err);
        }
});

app.post('/api/update-status', adminAuth, async (req, res) => {
        try {
            const orderId = parseInt(req.body.orderId);
            const status = String(req.body.status || '').slice(0, 100);
            const statusCode = req.body.statusCode;
            if (!Number.isInteger(orderId) || !status) return res.status(400).json({ error: 'Некорректные данные' });
            if (statusCode != null && !ORDER_STATUS_CODES.includes(statusCode)) return res.status(400).json({ error: 'Некорректный статус' });

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
                    'Выполняется': 'in_progress',
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
            sendServerError(res, err);
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
            sendServerError(res, err);
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

            if (order.status_code !== 'completed' && order.status_code !== 'done') {
                return res.status(403).json({ error: 'Недоступно' });
            }
            const rv = await pool.query('SELECT 1 FROM reviews WHERE order_id = $1 LIMIT 1', [order.id]);
            if (!rv.rows.length) return res.status(404).json({ error: 'Заказ не найден' });
            res.json({
                    ...order,
                    user_id: '0', email: null, sender_name: null, payment_method: null,
                    verification_code: null, user_name: null, user_username: null, comment: null, user_msg_id: null, admin_msg_id: null,
                    promo: order.promo ? '***' : null
            });
        } catch (err) {
            sendServerError(res, err);
        }
});

function generateRefCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 50; i++) {
        let s = '';
        for (let j = 0; j < 6; j++) s += chars[crypto.randomInt(chars.length)];
        const digits = (s.match(/\d/g) || []).length;
        if (digits < 2 || digits > 3) continue;
        if (/\d{3}/.test(s)) continue;
        return s;
    }
    return 'a1b2c3';
}

async function ensureRefCode(userId) {
    const existing = await pool.query('SELECT ref_code FROM app_users WHERE user_id = $1', [String(userId)]);
    if (existing.rows.length && existing.rows[0].ref_code) return existing.rows[0].ref_code;
    for (let i = 0; i < 20; i++) {
        const code = generateRefCode();
        const upd = await pool.query(
            'UPDATE app_users SET ref_code = $1 WHERE user_id = $2 AND ref_code IS NULL RETURNING ref_code',
            [code, String(userId)]
        );
        if (upd.rows.length) return upd.rows[0].ref_code;
        const again = await pool.query('SELECT ref_code FROM app_users WHERE user_id = $1', [String(userId)]);
        if (again.rows.length && again.rows[0].ref_code) return again.rows[0].ref_code;
    }
    return null;
}

app.get('/api/referral-code', userAuth, async (req, res) => {
        try {
            const refCode = await ensureRefCode(req.tgUserId);
            if (!refCode) return res.status(500).json({ error: 'Не удалось создать код' });
            res.json({ refCode });
        } catch (err) {
            sendServerError(res, err);
        }
});

app.post('/api/track-user', userAuth, async (req, res) => {
        try {
            const u = req.tgUser;
            const userId = req.tgUserId;
            const { referrerId, referrerCode } = req.body;

            let validReferrer = null;
            if (referrerCode && /^[a-z0-9]{6}$/.test(String(referrerCode))) {
                const refCheck = await pool.query('SELECT user_id FROM app_users WHERE ref_code = $1', [String(referrerCode)]);
                if (refCheck.rows.length && String(refCheck.rows[0].user_id) !== userId) {
                    validReferrer = String(refCheck.rows[0].user_id);
                }
            } else if (referrerId && String(referrerId) !== userId) {
                const refCheck = await pool.query('SELECT 1 FROM app_users WHERE user_id = $1', [String(referrerId)]);
                if (refCheck.rows.length) validReferrer = String(referrerId);
            }

            const refCode = await ensureRefCode(userId);

            await pool.query(`
            INSERT INTO app_users (user_id, user_name, user_username, photo_url, referrer_id, ref_code, last_seen)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                user_name = EXCLUDED.user_name,
                user_username = EXCLUDED.user_username,
                photo_url = EXCLUDED.photo_url,
                last_seen = NOW()
        `, [userId, String(u.first_name || '').slice(0, 100) || null, u.username ? String(u.username).slice(0, 64) : null, safeUrl(u.photo_url), validReferrer, refCode]);

            res.json({ success: true, refCode });
        } catch (err) {
            sendServerError(res, err);
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
            sendServerError(res, err);
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

                    if (req.isAdmin) {
                        item.user_id = r.user_id;
                        item.user_username = r.user_username;
                    }
                    return item;
            });

            res.json(list);
        } catch (err) {
            console.error('Ошибка /api/referral-list:', err.message);
            sendServerError(res, err);
        }
});

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
            sendServerError(res, err);
        }
});

app.get('/api/user-balance', userOrAdminAuth, async (req, res) => {
        try {
            const userId = req.tgUserId;
            if (!userId) return res.json({ balance: 0 });
            const result = await pool.query('SELECT balance FROM app_users WHERE user_id = $1', [String(userId)]);
            res.json({ balance: result.rows[0]?.balance || 0 });
        } catch (err) {
            sendServerError(res, err);
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
            sendServerError(res, err);
        }
});

app.delete('/api/wallet-transactions/:id', adminAuth, async (req, res) => {
        try {
            await pool.query('DELETE FROM wallet_transactions WHERE id = $1', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            sendServerError(res, err);
        }
});

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
            sendServerError(res, err);
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
            sendServerError(res, err);
        }
});

app.post('/api/check-promo', userAuth, async (req, res) => {
        try {
            const r = await validatePromo(pool, req.body.code, req.tgUserId);
            res.json(r.valid ? { valid: true, discount: r.discount } : { valid: false, reason: r.reason });
        } catch (err) {
            sendServerError(res, err);
        }
});

const ACTIVE_ORDER_LIMIT = 2;
const ORDER_BLOCK_MS = 60 * 60 * 1000;

async function countActiveOrders(db, userId) {
    const r = await db.query(
        `SELECT COUNT(*) AS c FROM orders
         WHERE user_id = $1 AND status_code NOT IN ('completed', 'done', 'cancelled', 'notfound')`,
        [String(userId)]
    );
    return parseInt(r.rows[0].c);
}

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
            sendServerError(res, err);
        }
});

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
            sendServerError(res, err);
        }
});

app.post('/api/user/:userId/balance', adminAuth, async (req, res) => {
        try {
            const { userId } = req.params;
            const { amount } = req.body;
            const amt = parseInt(amount);
            if (isNaN(amt) || amt === 0 || Math.abs(amt) > 10000000) return res.status(400).json({ error: 'Некорректная сумма' });
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
            sendServerError(res, err);
        }
});

app.post('/api/user/:userId/status', adminAuth, async (req, res) => {
        try {
            const { userId } = req.params;
            const { status } = req.body;
            await pool.query('UPDATE app_users SET status = $1 WHERE user_id = $2', [status, userId]);
            res.json({ success: true });
        } catch (err) {
            sendServerError(res, err);
        }
});

app.post('/api/sync-products', adminAuth, async (req, res) => {
        try {
            const { products } = req.body;
            if (!Array.isArray(products) || !products.length) {
                return res.status(400).json({ error: 'Пустой список товаров' });
            }
            if (products.length > 500 || products.some(p => !p || typeof p.id !== 'string' || p.id.length > 64 || !Number.isInteger(p.price) || p.price < 0 || p.price > 10000000)) {
                return res.status(400).json({ error: 'Некорректные товары' });
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
            sendServerError(res, err);
        }
});

app.get('/api/promo-codes', adminAuth, async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM promo_codes ORDER BY id DESC');
            res.json(result.rows);
        } catch (err) {
            sendServerError(res, err);
        }
});

app.post('/api/promo-codes', adminAuth, async (req, res) => {
        try {
            const { code, discount, type, userId, expiresAt, maxUses } = req.body;
            const cleanCode = String(code || '').toUpperCase().trim();
            const discountNum = parseInt(discount);
            const maxUsesNum = maxUses ? parseInt(maxUses) : null;
            if (!/^[A-Z0-9_-]{3,32}$/.test(cleanCode) || !Number.isInteger(discountNum) || discountNum < 1 || discountNum > 100) {
                return res.status(400).json({ error: 'Некорректный код или скидка (1–100%)' });
            }
            if (maxUsesNum !== null && (!Number.isInteger(maxUsesNum) || maxUsesNum < 1)) {
                return res.status(400).json({ error: 'Некорректный лимит использований' });
            }
            if (type && !PROMO_TYPES.includes(type)) return res.status(400).json({ error: 'Некорректный тип промокода' });
            if (expiresAt && isNaN(new Date(expiresAt).getTime())) return res.status(400).json({ error: 'Некорректная дата' });
            await pool.query(
                `INSERT INTO promo_codes (code, discount, type, user_id, expires_at, max_uses)
             VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    cleanCode,
                    discountNum,
                    type || 'all',
                    userId || null,
                    expiresAt || null,
                    maxUsesNum
                ]
            );
            res.json({ success: true });
        } catch (err) {
            if (err.code === '23505') {
                res.status(400).json({ error: 'Промокод с таким названием уже существует' });
            } else {
                sendServerError(res, err);
            }
        }
});

app.delete('/api/promo-codes/:id', adminAuth, async (req, res) => {
        try {
            await pool.query('UPDATE promo_codes SET active = FALSE WHERE id = $1', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            sendServerError(res, err);
        }
});

app.post('/api/promo-codes/:id/activate', adminAuth, async (req, res) => {
        try {
            await pool.query('UPDATE promo_codes SET active = TRUE WHERE id = $1', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            sendServerError(res, err);
        }
});

app.delete('/api/promo-codes/:id/delete', adminAuth, async (req, res) => {
        try {
            await pool.query('DELETE FROM promo_codes WHERE id = $1', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            sendServerError(res, err);
        }
});

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
            sendServerError(res, err);
        }
});

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
            sendServerError(res, err);
        }
});

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
            sendServerError(res, err);
        }
});

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

function addDaysStr(dayStr, n) {
    const d = new Date(dayStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

function parseOrderItems(raw) {
    try {
        const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : [];
    } catch (e) {
        return [];
    }
}

app.get('/api/admin/stats/detailed', adminAuth, async (req, res) => {
        try {
            const today = new Date(Date.now() + MSK_OFFSET_MS).toISOString().slice(0, 10);
            const cutoff = Date.parse(addDaysStr(today, -29) + 'T00:00:00+03:00');

            const [tot, days, pay, hours, items] = await Promise.all([
                    pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM orders) AS orders,
                    (SELECT COUNT(*) FROM orders WHERE status_code IN ('completed', 'done')) AS completed,
                    (SELECT COUNT(*) FROM orders WHERE status_code = 'cancelled') AS cancelled,
                    (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status_code IN ('completed', 'done')) AS revenue,
                    (SELECT COUNT(*) FROM app_users) AS users,
                    (SELECT COUNT(*) FROM app_users WHERE first_seen >= NOW() - INTERVAL '7 days') AS new_users_7d,
                    (SELECT COUNT(*) FROM app_users WHERE referrer_id IS NOT NULL) AS referrals,
                    (SELECT COALESCE(SUM(balance), 0) FROM app_users) AS wallets_total,
                    (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE type LIKE $1) AS cashback_paid
            `, ['cashback%']),
                    pool.query(`
                SELECT to_char(to_timestamp("timestamp" / 1000.0) AT TIME ZONE 'Europe/Moscow', 'YYYY-MM-DD') AS day,
                       COUNT(*) AS orders,
                       COUNT(*) FILTER (WHERE status_code IN ('completed', 'done')) AS completed,
                       COALESCE(SUM(total) FILTER (WHERE status_code IN ('completed', 'done')), 0) AS revenue
                FROM orders
                WHERE "timestamp" >= $1
                GROUP BY 1
            `, [cutoff]),
                    pool.query(`
                SELECT COALESCE(payment_method, 'Не указан') AS method,
                       COUNT(*) AS count,
                       COALESCE(SUM(total), 0) AS revenue
                FROM orders
                WHERE status_code IN ('completed', 'done')
                GROUP BY 1
                ORDER BY revenue DESC
            `),
                    pool.query(`
                SELECT EXTRACT(HOUR FROM to_timestamp("timestamp" / 1000.0) AT TIME ZONE 'Europe/Moscow')::int AS hour,
                       COUNT(*) AS orders
                FROM orders
                WHERE "timestamp" IS NOT NULL
                GROUP BY 1
            `),
                    pool.query(`SELECT items FROM orders WHERE status_code IN ('completed', 'done') AND items IS NOT NULL`)
            ]);

            const t = tot.rows[0];
            const completed = parseInt(t.completed);
            const revenue = parseInt(t.revenue);

            const dayMap = new Map(days.rows.map(r => [r.day, r]));
            const byDay = [];
            for (let i = 29; i >= 0; i--) {
                const day = addDaysStr(today, -i);
                const r = dayMap.get(day);
                byDay.push({
                        day,
                        orders: r ? parseInt(r.orders) : 0,
                        completed: r ? parseInt(r.completed) : 0,
                        revenue: r ? parseInt(r.revenue) : 0
                });
            }

            const byPayment = pay.rows.map(r => ({
                        method: r.method,
                        count: parseInt(r.count),
                        revenue: parseInt(r.revenue)
            }));

            const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 }));
            for (const r of hours.rows) {
                const h = parseInt(r.hour);
                if (h >= 0 && h < 24) byHour[h].orders = parseInt(r.orders);
            }

            const productMap = new Map();
            for (const row of items.rows) {
                for (const it of parseOrderItems(row.items)) {
                    if (it.id == null) continue;
                    const key = String(it.id);
                    const qty = parseInt(it.qty) || 0;
                    const price = Number(it.price) || 0;
                    const cur = productMap.get(key) || { id: key, name: it.name || key, qty: 0, revenue: 0 };
                    cur.qty += qty;
                    cur.revenue += qty * price;
                    productMap.set(key, cur);
                }
            }
            const topProducts = [...productMap.values()]
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 10);

            res.json({
                    totals: {
                        orders: parseInt(t.orders),
                        completed,
                        cancelled: parseInt(t.cancelled),
                        revenue,
                        avgCheck: completed ? Math.round(revenue / completed) : 0,
                        users: parseInt(t.users),
                        newUsers7d: parseInt(t.new_users_7d),
                        referrals: parseInt(t.referrals),
                        walletsTotal: parseInt(t.wallets_total),
                        cashbackPaid: parseInt(t.cashback_paid)
                    },
                    byDay,
                    byPayment,
                    topProducts,
                    byHour
            });
        } catch (err) {
            sendServerError(res, err);
        }
});

function chatUserId(v) {
    const s = typeof v === 'string' ? v.trim() : '';
    return s && s.length <= 32 ? s : null;
}

app.get('/api/admin/chats', adminAuth, async (req, res) => {
        try {
            const result = await pool.query(`
            SELECT lm.user_id,
                   au.user_name,
                   au.user_username,
                   au.photo_url,
                   lm.text AS last_text,
                   lm.kind AS last_kind,
                   lm.direction AS last_direction,
                   lm.created_at AS last_at,
                   EXISTS (
                       SELECT 1 FROM bot_messages bm
                       WHERE bm.user_id = lm.user_id
                         AND bm.direction = 'in'
                         AND bm.id > COALESCE(r.last_read_id, 0)
                   ) AS unread
            FROM (
                SELECT DISTINCT ON (user_id) id, user_id, direction, kind, text, created_at
                FROM bot_messages
                ORDER BY user_id, id DESC
            ) lm
            LEFT JOIN app_users au ON au.user_id = lm.user_id
            LEFT JOIN bot_chat_reads r ON r.user_id = lm.user_id
            ORDER BY lm.id DESC
            LIMIT 200
        `);
            res.json(result.rows);
        } catch (err) {
            sendServerError(res, err);
        }
});

app.get('/api/admin/chats/:userId', adminAuth, async (req, res) => {
        try {
            const userId = chatUserId(req.params.userId);
            if (!userId) return res.status(400).json({ error: 'Некорректный пользователь' });
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
            const before = parseInt(req.query.before);
            const params = [userId];
            let where = 'user_id = $1';
            if (Number.isInteger(before) && before > 0) {
                params.push(before);
                where += ` AND id < $${params.length}`;
            }
            params.push(limit);
            const result = await pool.query(`
            SELECT id, direction, kind, text, has_thumb, meta, edited, created_at
            FROM (
                SELECT id, direction, kind, text, (thumb_id IS NOT NULL) AS has_thumb, meta, edited, created_at
                FROM bot_messages
                WHERE ${where}
                ORDER BY id DESC
                LIMIT $${params.length}
            ) t
            ORDER BY id ASC
        `, params);
            res.json(result.rows);
        } catch (err) {
            sendServerError(res, err);
        }
});

app.post('/api/admin/chats/:userId/send', adminAuth, async (req, res) => {
        try {
            const userId = chatUserId(req.params.userId);
            if (!userId) return res.status(400).json({ error: 'Некорректный пользователь' });
            const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
            if (text.length < 1 || text.length > BOT_TEXT_MAX) {
                return res.status(400).json({ error: 'Текст должен быть от 1 до 4000 символов' });
            }
            const bot = getBot();
            if (!bot) return res.status(400).json({ error: 'Бот недоступен' });

            let sentMsg = null;
            try {
                sentMsg = await bot.telegram.sendMessage(userId, text, { protect_content: true });
            } catch (e) {
                if (e && e.response) {
                    console.error('Telegram отказал в отправке:', e.message);
                    return res.status(400).json({ error: 'Пользователь не запускал бота или заблокировал его' });
                }
                throw e;
            }

            const message = await logBotMessage(userId, 'out', 'text', text, null, null, null, sentMsg && sentMsg.message_id);
            res.json({ success: true, message });
        } catch (err) {
            sendServerError(res, err);
        }
});

app.delete('/api/admin/chats/:userId/messages/:messageId', adminAuth, async (req, res) => {
        try {
            const userId = chatUserId(req.params.userId);
            const id = parseInt(req.params.messageId);
            if (!userId || !Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Некорректный запрос' });
            const found = await pool.query(
                `SELECT id, tg_message_id FROM bot_messages WHERE id = $1 AND user_id = $2`, [id, userId]
            );
            if (!found.rows.length) return res.status(404).json({ error: 'Сообщение не найдено' });
            const tgId = found.rows[0].tg_message_id;

            let telegram = null;
            if (tgId) {
                const bot = getBot();
                if (!bot) {
                    telegram = false;
                } else {
                    try {
                        await bot.telegram.deleteMessage(userId, Number(tgId));
                        telegram = true;
                    } catch (e) {
                        telegram = /message to delete not found/i.test(String(e && e.message));
                        if (!telegram) console.log(`Не удалось удалить сообщение ${tgId} у пользователя: ${e.message}`);
                    }
                }
            }
            await pool.query(`DELETE FROM bot_messages WHERE id = $1`, [id]);
            res.json({ success: true, telegram });
        } catch (err) {
            sendServerError(res, err);
        }
});

app.post('/api/admin/chats/:userId/read', adminAuth, async (req, res) => {
        try {
            const userId = chatUserId(req.params.userId);
            if (!userId) return res.status(400).json({ error: 'Некорректный пользователь' });
            await pool.query(`
            INSERT INTO bot_chat_reads (user_id, last_read_id)
            SELECT $1, COALESCE(MAX(id), 0) FROM bot_messages WHERE user_id = $1
            ON CONFLICT (user_id) DO UPDATE
            SET last_read_id = GREATEST(bot_chat_reads.last_read_id, EXCLUDED.last_read_id)
        `, [userId]);
            res.json({ success: true });
        } catch (err) {
            sendServerError(res, err);
        }
});

const CHAT_MEDIA_MIME = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    oga: 'audio/ogg', ogg: 'audio/ogg', opus: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4'
};
const CHAT_MEDIA_FALLBACK = {
    photo: 'image/jpeg', video: 'video/mp4', animation: 'video/mp4', video_note: 'video/mp4',
    voice: 'audio/ogg', sticker: 'image/webp'
};

async function sendChatMedia(req, res) {
    try {
        const id = parseInt(req.params.messageId);
        if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: 'Не найдено' });
        const found = await pool.query(`SELECT kind, file_id, thumb_id FROM bot_messages WHERE id = $1`, [id]);
        if (!found.rows.length) return res.status(404).json({ error: 'Не найдено' });
        const row = found.rows[0];
        const wantThumb = req.query.thumb === '1';
        const fileId = wantThumb ? row.thumb_id : row.file_id;
        if (!fileId || !CHAT_MEDIA_FALLBACK[row.kind]) return res.status(404).json({ error: 'Не найдено' });

        const bot = getBot();
        if (!bot) return res.status(503).json({ error: 'Бот недоступен' });

        let fileUrl;
        try {
            fileUrl = await bot.telegram.getFileLink(fileId);
        } catch (e) {
            const tooBig = /too big/i.test(String(e && e.message));
            console.error('Telegram не отдал ссылку на файл:', e.message);
            return res.status(tooBig ? 413 : 502).json({ error: tooBig ? 'Файл слишком большой (больше 20 МБ)' : 'Не удалось получить файл' });
        }

        let upstream;
        try {
            upstream = await fetch(String(fileUrl));
        } catch (e) {
            console.error('Не удалось загрузить файл из Telegram');
            return res.status(502).json({ error: 'Не удалось получить файл' });
        }
        if (!upstream.ok) return res.status(502).json({ error: 'Не удалось получить файл' });

        const buf = Buffer.from(await upstream.arrayBuffer());
        const ext = (String(fileUrl).split('?')[0].split('.').pop() || '').toLowerCase();
        let mime = CHAT_MEDIA_MIME[ext];
        if (!mime) {
            const up = upstream.headers.get('content-type');
            mime = up && up !== 'application/octet-stream' ? up : (wantThumb ? 'image/jpeg' : CHAT_MEDIA_FALLBACK[row.kind]);
        }
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'private, max-age=86400');
        res.send(buf);
    } catch (err) {
        sendServerError(res, err);
    }
}
app.get('/api/admin/chat-media/:messageId', adminAuth, sendChatMedia);

app.get('/api/admin/chat-photo/:messageId', adminAuth, sendChatMedia);

app.get('/api/settings', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM settings WHERE id = 1');
            if (!result.rows.length) {
                res.json({ bot_status: 'open', work_start: '10:00', work_end: '23:59' });
            } else {
                res.json(result.rows[0]);
            }
        } catch (err) {
            sendServerError(res, err);
        }
});

app.post('/api/settings', adminAuth, async (req, res) => {
        try {
            const { bot_status } = req.body;
            if (typeof bot_status !== 'string' || bot_status.length > 20) return res.status(400).json({ error: 'Некорректный статус' });
            await pool.query(`
            INSERT INTO settings (id, bot_status) VALUES (1, $1)
            ON CONFLICT (id) DO UPDATE SET bot_status = $1
        `, [bot_status]);
            res.json({ success: true });
        } catch (err) {
            sendServerError(res, err);
        }
});

app.get('/api/reviews', async (req, res) => {
        try {
            const result = await pool.query(`
            SELECT r.id, r.user_id, r.user_name, r.user_username, r.photo_url, r.text, r.stars,
                   r.satisfied, r.rating, r.order_id, r.order_number, r.created_at,
                   o.items as order_items, o.game_name as order_game_name
            FROM reviews r
            LEFT JOIN orders o ON o.order_number = r.order_number
            ORDER BY r.created_at DESC LIMIT 50
        `);
            res.json(result.rows);
        } catch (err) {
            sendServerError(res, err);
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
            sendServerError(res, err);
        }
});

app.post('/api/admin/verify-telegram', async (req, res) => {
        try {
            const limit = checkRateLimit(req.ip);
            if (!limit.allowed) return res.status(429).json({ success: false, reason: 'too_many_attempts' });
            const { initData } = req.body;
            if (!initData || typeof initData !== 'string' || initData.length > 4096) return res.status(400).json({ success: false });
            if (!BOT_TOKEN) return res.status(503).json({ success: false });

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

            if (!hash || !safeEqualStr(hash, expectedHash)) {
                return res.status(403).json({ success: false, reason: 'invalid_signature' });
            }

            const authDate = parseInt(params.get('auth_date'));
            const now = Math.floor(Date.now() / 1000);
            if (!authDate || now - authDate > 86400) {
                return res.status(403).json({ success: false, reason: 'expired' });
            }

            const user = JSON.parse(params.get('user') || '{}');
            if (Number(user.id) !== ADMIN_ID) {
                return res.status(403).json({ success: false, reason: 'not_admin' });
            }

            const sessionToken = createAdminSessionToken(user.id);

            res.json({ success: true, sessionToken });

        } catch(e) {
            console.error('Ошибка верификации Telegram:', e.message);
            res.status(500).json({ success: false });
        }
});

app.get('/api/user-reviews', userAuth, async (req, res) => {
        try {
            const result = await pool.query(`
            SELECT r.id, r.user_id, r.user_name, r.user_username, r.photo_url, r.text, r.stars,
                   r.satisfied, r.rating, r.order_id, r.order_number, r.created_at,
                   o.items as order_items, o.game_name as order_game_name
            FROM reviews r
            LEFT JOIN orders o ON o.order_number = r.order_number
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC LIMIT 100
        `, [req.tgUserId]);
            res.json(result.rows);
        } catch (err) {
            sendServerError(res, err);
        }
});

let appStatsCache = { at: 0, data: null };
const APP_STATS_TTL_MS = 5 * 60 * 1000;

app.get('/api/app-stats', async (req, res) => {
        try {
            if (appStatsCache.data && Date.now() - appStatsCache.at < APP_STATS_TTL_MS) {
                return res.json(appStatsCache.data);
            }

            const [orders, customers, users, reviews, items] = await Promise.all([
                    pool.query(`
                SELECT COUNT(*) AS c, COALESCE(SUM(total), 0) AS revenue
                FROM orders WHERE status_code IN ('completed', 'done')
            `),
                    pool.query(`
                SELECT COUNT(DISTINCT user_id) AS c
                FROM orders WHERE status_code IN ('completed', 'done') AND user_id IS NOT NULL
            `),
                    pool.query('SELECT COUNT(*) AS c FROM app_users'),
                    pool.query(`
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE COALESCE(rating, CASE WHEN satisfied THEN 'good' ELSE 'bad' END) = 'good') AS good
                FROM reviews
            `),
                    pool.query(`SELECT items FROM orders WHERE status_code IN ('completed', 'done') AND items IS NOT NULL`)
            ]);

            const qtyById = new Map();
            for (const row of items.rows) {
                for (const it of parseOrderItems(row.items)) {
                    if (it.id == null) continue;
                    const key = String(it.id);
                    qtyById.set(key, (qtyById.get(key) || 0) + (parseInt(it.qty) || 0));
                }
            }
            const topProducts = [...qtyById.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id, qty]) => ({ id, qty }));

            const reviewsTotal = parseInt(reviews.rows[0].total);
            const reviewsGood = parseInt(reviews.rows[0].good);

            const data = {
                completedOrders: parseInt(orders.rows[0].c),
                revenue: parseInt(orders.rows[0].revenue),
                customers: parseInt(customers.rows[0].c),
                users: parseInt(users.rows[0].c),
                reviews: reviewsTotal,
                goodSharePercent: reviewsTotal ? Math.round(reviewsGood * 100 / reviewsTotal) : 0,
                topProducts,
                updatedAt: new Date().toISOString()
            };
            appStatsCache = { at: Date.now(), data };
            res.json(data);
        } catch (err) {
            sendServerError(res, err);
        }
});

app.use((err, req, res, next) => {
        if (res.headersSent) return next(err);
        if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Некорректный JSON' });
        console.error('Ошибка запроса:', err && err.message);
        res.status(err && err.status ? err.status : 500).json({ error: 'Ошибка запроса' });
});

process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));
process.on('uncaughtException', (e) => console.error('uncaughtException:', e));

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
