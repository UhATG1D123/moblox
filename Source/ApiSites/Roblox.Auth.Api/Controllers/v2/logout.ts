import { Request, Response } from 'express';
import { PartialDatabase } from '../../../../Assemblies/Mssql/Roblox.Mssql.PartialDatabase/Implementation/PartialDatabase';

const GetSessionToken = (Request: Request): string | null => {
	const CookieHeader = Request.headers.cookie;
	if (typeof CookieHeader !== 'string') return null;
	const Cookie = CookieHeader.split(';').map((Value) => Value.trim()).find((Value) => Value.startsWith('.ROBLOSECURITY='));
	if (!Cookie) return null;
	const Token = Cookie.slice('.ROBLOSECURITY='.length);
	try {
		return decodeURIComponent(Token);
	} catch {
		return Token;
	}
};

export default {
	method: 'all',
	func: async (Request: Request, Response: Response) => {
		if (Request.method === 'OPTIONS') return Response.status(204).send();
		if (Request.method !== 'POST') return Response.status(405).json({ errors: [{ message: 'Use POST to sign out.' }] });

		const SessionToken = GetSessionToken(Request);
		if (SessionToken) {
			const Database = new PartialDatabase('RobloxMembership', '', '');
			const [Connected, ConnectError] = await Database.Connect();
			if (!Connected) {
				console.error('[Moblox Auth] Logout database connection failed:', ConnectError);
				return Response.status(503).json({ errors: [{ message: 'Sign-out is temporarily unavailable. Please try again.' }] });
			}

			try {
				const [Succeeded, QueryError] = await Database.Query(
					'DELETE FROM `robloxmembership`.`session` WHERE `SessionToken` = ?',
					[SessionToken]
				);
				if (!Succeeded) {
					console.error('[Moblox Auth] Logout session deletion failed:', QueryError);
					return Response.status(500).json({ errors: [{ message: 'We could not end your session.' }] });
				}
			} catch (ErrorValue) {
				console.error('[Moblox Auth] Logout failed:', ErrorValue instanceof Error ? ErrorValue.message : 'Unknown database error');
				return Response.status(500).json({ errors: [{ message: 'We could not end your session.' }] });
			} finally {
				await Database.Disconnect();
			}
		}

		Response.clearCookie('.ROBLOSECURITY', { path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
		return Response.status(200).json({ success: true });
	},
};
