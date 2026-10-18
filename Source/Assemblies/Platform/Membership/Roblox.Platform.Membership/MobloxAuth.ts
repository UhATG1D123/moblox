import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { createPool, Pool } from 'mysql';
import { Request, Response, Router } from 'express';

const scrypt = promisify(scryptCallback);
const router: Router = Router();
let pool: Pool;
let schemaReady: Promise<void>;

interface MobloxAccount {
	Id: number;
	Username: string;
	DisplayName: string;
	PasswordHash: string;
	Description: string;
	CreatedAt: Date;
}

interface MobloxSession {
	AccountId: number;
	ExpiresAt: Date;
}

function getPool(): Pool {
	if (!pool) {
		const host = process.env.DB_HOST;
		const user = process.env.DB_USER;
		const password = process.env.DB_PASSWORD;
		if (!host || !user || !password) throw new Error('Database environment variables are not configured.');
		pool = createPool({
			host,
			port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 4000,
			user,
			password,
			database: 'robloxmembership',
			connectionLimit: 5,
			connectTimeout: 15000,
			ssl: (process.env.DB_SSL || 'true').toLowerCase() === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
		});
	}
	return pool;
}

function query<T = any>(sql: string, values: any[] = []): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		getPool().query(sql, values, (error, results) => {
			if (error) return reject(error);
			resolve(results as T);
		});
	});
}

async function ensureSchema(): Promise<void> {
	if (!schemaReady) {
		schemaReady = (async () => {
			await query(`CREATE TABLE IF NOT EXISTS moblox_accounts (
				Id BIGINT NOT NULL AUTO_INCREMENT,
				Username VARCHAR(20) NOT NULL,
				DisplayName VARCHAR(40) NOT NULL,
				PasswordHash VARCHAR(255) NOT NULL,
				Description VARCHAR(1000) NOT NULL DEFAULT '',
				CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (Id),
				UNIQUE KEY moblox_accounts_username_unique (Username)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`);
			await query(`CREATE TABLE IF NOT EXISTS moblox_sessions (
				Id BIGINT NOT NULL AUTO_INCREMENT,
				AccountId BIGINT NOT NULL,
				TokenHash CHAR(64) NOT NULL,
				ExpiresAt DATETIME NOT NULL,
				CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (Id),
				UNIQUE KEY moblox_sessions_token_unique (TokenHash),
				KEY moblox_sessions_account_idx (AccountId),
				KEY moblox_sessions_expiry_idx (ExpiresAt)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`);
		})().catch((error) => {
			schemaReady = undefined;
			throw error;
		});
	}
	return schemaReady;
}

function sendError(response: Response, status: number, message: string): void {
	response.status(status).json({ success: false, error: message });
}

function readCookie(request: Request, name: string): string {
	const cookieHeader = request.headers.cookie || '';
	const part = cookieHeader.split(';').map((value) => value.trim()).find((value) => value.startsWith(name + '='));
	if (!part) return '';
	try {
		return decodeURIComponent(part.slice(name.length + 1));
	} catch {
		return '';
	}
}

function setSessionCookie(response: Response, token: string): void {
	response.cookie('moblox_session', token, {
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 30 * 24 * 60 * 60 * 1000,
	});
}

async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString('hex');
	const derived = (await scrypt(password, salt, 64)) as Buffer;
	return 'scrypt$' + salt + '$' + derived.toString('hex');
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const parts = stored.split('$');
	if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
	const derived = (await scrypt(password, parts[1], 64)) as Buffer;
	return timingSafeEqual(derived, Buffer.from(parts[2], 'hex'));
}

async function createSession(response: Response, accountId: number): Promise<void> {
	const token = randomBytes(32).toString('hex');
	const tokenHash = createHash('sha256').update(token).digest('hex');
	await query('DELETE FROM moblox_sessions WHERE ExpiresAt <= UTC_TIMESTAMP()');
	await query('INSERT INTO moblox_sessions (AccountId, TokenHash, ExpiresAt) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))', [accountId, tokenHash]);
	setSessionCookie(response, token);
}

async function getCurrentAccount(request: Request): Promise<MobloxAccount | null> {
	const token = readCookie(request, 'moblox_session');
	if (!token || token.length !== 64 || !/^[a-f0-9]+$/.test(token)) return null;
	const tokenHash = createHash('sha256').update(token).digest('hex');
	const rows = await query<MobloxAccount[]>(
		' SELECT a.Id, a.Username, a.DisplayName, a.Description, a.CreatedAt FROM moblox_accounts a INNER JOIN moblox_sessions s ON s.AccountId = a.Id WHERE s.TokenHash = ? AND s.ExpiresAt > UTC_TIMESTAMP() LIMIT 1',
		[tokenHash],
	);
	return rows[0] || null;
}

router.use(require('express').json({ limit: '10kb' }));
router.use(require('express').urlencoded({ extended: false, limit: '10kb' }));

router.get('/account/signupredir', (_request: Request, response: Response) => {
	response.redirect('/account/signup');
});

router.get('/account/signup', (_request: Request, response: Response) => {
	response.type('html').send(authPage('Create your Moblox account', 'signup'));
});

router.get('/login', (_request: Request, response: Response) => {
	response.type('html').send(authPage('Log in to Moblox', 'login'));
});

router.post('/api/moblox/auth/signup', async (request: Request, response: Response) => {
	try {
		await ensureSchema();
		const username = typeof request.body.username === 'string' ? request.body.username.trim() : '';
		const displayNameInput = typeof request.body.displayName === 'string' ? request.body.displayName.trim() : '';
		const password = typeof request.body.password === 'string' ? request.body.password : '';
		if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return sendError(response, 400, 'Username must be 3–20 characters and use only letters, numbers, or underscores.');
		if (password.length < 10 || password.length > 128) return sendError(response, 400, 'Password must be between 10 and 128 characters.');
		if (displayNameInput.length > 40) return sendError(response, 400, 'Display name must be 40 characters or fewer.');
		const passwordHash = await hashPassword(password);
		const displayName = displayNameInput || username;
		const result: any = await query('INSERT INTO moblox_accounts (Username, DisplayName, PasswordHash) VALUES (?, ?, ?)', [username, displayName, passwordHash]);
		await createSession(response, result.insertId);
		return response.status(201).json({ success: true, account: { id: result.insertId, username, displayName } });
	} catch (error: any) {
		if (error && error.code === 'ER_DUP_ENTRY') return sendError(response, 409, 'That username is already taken.');
		return sendError(response, 500, 'Could not create your account. Please try again later.');
	}
});

router.post('/api/moblox/auth/login', async (request: Request, response: Response) => {
	try {
		await ensureSchema();
		const username = typeof request.body.username === 'string' ? request.body.username.trim() : '';
		const password = typeof request.body.password === 'string' ? request.body.password : '';
		if (!username || !password || password.length > 128) return sendError(response, 400, 'Enter your username and password.');
		const rows = await query<MobloxAccount[]>('SELECT Id, Username, DisplayName, PasswordHash, Description, CreatedAt FROM moblox_accounts WHERE Username = ? LIMIT 1', [username]);
		const account = rows[0];
		if (!account || !(await verifyPassword(password, account.PasswordHash))) return sendError(response, 401, 'Incorrect username or password.');
		await createSession(response, account.Id);
		return response.json({ success: true, account: { id: account.Id, username: account.Username, displayName: account.DisplayName } });
	} catch {
		return sendError(response, 500, 'Could not log in right now. Please try again later.');
	}
});

router.post('/api/moblox/auth/logout', async (request: Request, response: Response) => {
	try {
		await ensureSchema();
		const token = readCookie(request, 'moblox_session');
		if (token && /^[a-f0-9]{64}$/.test(token)) {
			await query('DELETE FROM moblox_sessions WHERE TokenHash = ?', [createHash('sha256').update(token).digest('hex')]);
		}
		response.clearCookie('moblox_session', { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
		return response.json({ success: true });
	} catch {
		return sendError(response, 500, 'Could not log out right now.');
	}
});

router.get('/api/moblox/auth/me', async (request: Request, response: Response) => {
	try {
		await ensureSchema();
		const account = await getCurrentAccount(request);
		if (!account) return sendError(response, 401, 'You are not logged in.');
		return response.json({ success: true, account: { id: account.Id, username: account.Username, displayName: account.DisplayName, description: account.Description, createdAt: account.CreatedAt } });
	} catch {
		return sendError(response, 500, 'Could not load your account right now.');
	}
});

router.get('/users/:username', async (request: Request, response: Response) => {
	try {
		await ensureSchema();
		const rows = await query<MobloxAccount[]>('SELECT Id, Username, DisplayName, Description, CreatedAt FROM moblox_accounts WHERE Username = ? LIMIT 1', [request.params.username]);
		const account = rows[0];
		if (!account) return response.status(404).type('html').send('<!doctype html><title>Moblox</title><h1>User not found</h1><a href="/">Home</a>');
		return response.type('html').send('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml(account.DisplayName) + ' - Moblox</title><style>body{font-family:Arial,sans-serif;background:#f2f4f7;margin:0;color:#202227}.card{max-width:680px;margin:8vh auto;background:#fff;padding:32px;border-radius:14px;box-shadow:0 4px 24px #0001}a{color:#335fff}</style></head><body><main class="card"><a href="/">Moblox</a><h1>' + escapeHtml(account.DisplayName) + '</h1><p>@' + escapeHtml(account.Username) + '</p><p>' + escapeHtml(account.Description || 'This user has not added a description yet.') + '</p><small>Joined ' + escapeHtml(new Date(account.CreatedAt).toLocaleDateString()) + '</small></main></body></html>');
	} catch {
		return response.status(500).type('html').send('<!doctype html><title>Moblox</title><h1>Profile unavailable</h1>');
	}
});

function escapeHtml(value: string): string {
	return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function authPage(title: string, mode: 'signup' | 'login'): string {
	const signup = mode === 'signup';
	return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + ' | Moblox</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f2f4f7;font-family:Arial,sans-serif;color:#202227}.card{width:min(420px,calc(100% - 32px));background:white;padding:30px;border-radius:14px;box-shadow:0 8px 30px #00000012}h1{margin:0 0 8px;font-size:26px}.muted{color:#667085;font-size:14px}label{display:block;font-weight:600;font-size:14px;margin:16px 0 6px}input{width:100%;padding:12px;border:1px solid #d0d5dd;border-radius:8px;font-size:16px}button{width:100%;border:0;border-radius:8px;background:#335fff;color:white;font-size:16px;font-weight:700;padding:13px;margin-top:22px;cursor:pointer}#message{min-height:20px;color:#b42318;font-size:14px;margin-top:12px}.brand{font-weight:800;color:#335fff;margin-bottom:20px}a{color:#335fff}</style></head><body><main class="card"><div class="brand">MOBLOX</div><h1>' + title + '</h1><p class="muted">' + (signup ? 'Create a new Moblox account.' : 'Welcome back to Moblox.') + '</p><form id="auth-form">' + (signup ? '<label for="displayName">Display name (optional)</label><input id="displayName" name="displayName" maxlength="40" autocomplete="nickname">' : '') + '<label for="username">Username</label><input id="username" name="username" minlength="3" maxlength="20" autocomplete="username" required><label for="password">Password</label><input id="password" name="password" type="password" minlength="' + (signup ? '10' : '1') + '" maxlength="128" autocomplete="' + (signup ? 'new-password' : 'current-password') + '" required><button type="submit">' + (signup ? 'Create account' : 'Log in') + '</button><div id="message" role="alert"></div></form><p class="muted">' + (signup ? 'Already have an account? <a href="/login">Log in</a>' : 'New to Moblox? <a href="/account/signup">Create an account</a>') + '</p></main><script>document.getElementById("auth-form").addEventListener("submit",async function(event){event.preventDefault();var form=new FormData(event.currentTarget);var data={username:form.get("username"),password:form.get("password")};' + (signup ? 'data.displayName=form.get("displayName");' : '') + 'var message=document.getElementById("message");message.textContent="";try{var response=await fetch("/api/moblox/auth/' + mode + '",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(data)});var result=await response.json();if(!response.ok){message.textContent=result.error||"Request failed.";return;}window.location.href="/users/"+encodeURIComponent(result.account.username);}catch(error){message.textContent="Connection failed. Please try again.";}});</script></body></html>';
}

export const MobloxAuthRoutes = router;
