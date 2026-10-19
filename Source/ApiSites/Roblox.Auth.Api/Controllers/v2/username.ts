import { Request, Response } from 'express';
import { PartialDatabase } from '../../../../Assemblies/Mssql/Roblox.Mssql.PartialDatabase/Implementation/PartialDatabase';

interface IUsernameValidationRequest {
	username?: unknown;
	Username?: unknown;
	birthday?: unknown;
	Birthday?: unknown;
	context?: unknown;
}

const UsernamePattern = /^[A-Za-z0-9_]{3,20}$/;

export default {
	method: 'all',
	func: async (Request: Request, Response: Response) => {
		if (Request.method === 'OPTIONS') return Response.status(204).send();
		if (Request.method !== 'POST' && Request.method !== 'GET') {
			return Response.status(405).json({ code: 'InvalidCharactersError', message: 'Use GET or POST to validate a username.' });
		}

		const Body = (Request.method === 'GET' ? Request.query : Request.body || {}) as IUsernameValidationRequest;
		const UsernameValue = Body.username ?? Body.Username;
		const Username = typeof UsernameValue === 'string' ? UsernameValue.trim() : '';
		const Invalid = (code: string, message: string) => Response.status(200).json({ code, message });

		if (!Username) return Invalid('InvalidCharactersError', 'Enter a username.');
		if (Username.length < 3 || Username.length > 20) return Invalid('InvalidLengthError', 'Usernames must be 3–20 characters long.');
		if (Username.startsWith('_') || Username.endsWith('_')) return Invalid('StartsOrEndsWithUnderscoreError', 'Usernames cannot start or end with an underscore.');
		if ((Username.match(/_/g) || []).length > 1) return Invalid('TooManyUnderscoresError', 'Usernames can contain at most one underscore.');
		if (!UsernamePattern.test(Username)) return Invalid('InvalidCharactersError', 'Usernames can only contain letters, numbers, and underscores.');

		const Database = new PartialDatabase('RobloxMembership', '', '');
		const [Connected, ConnectError] = await Database.Connect();
		if (!Connected) {
			console.error('[Moblox Auth] Username validation database connection failed:', ConnectError);
			return Response.status(503).json({ code: 'UnknownError', message: 'Username validation is temporarily unavailable.' });
		}

		try {
			const [Succeeded, QueryError, Users] = await Database.Query(
				'SELECT `Id` FROM `robloxmembership`.`user` WHERE LOWER(`Name`) = LOWER(?) LIMIT 1',
				[Username]
			);
			if (!Succeeded) {
				console.error('[Moblox Auth] Username validation query failed:', QueryError);
				return Response.status(500).json({ code: 'UnknownError', message: 'We could not validate that username.' });
			}
			if (Users.length > 0) return Invalid('AlreadyInUseError', 'That username is already in use.');
			return Invalid('ValidUsername', 'Username is valid.');
		} catch (ErrorValue) {
			console.error('[Moblox Auth] Username validation failed:', ErrorValue instanceof Error ? ErrorValue.message : 'Unknown database error');
			return Response.status(500).json({ code: 'UnknownError', message: 'We could not validate that username.' });
		} finally {
			await Database.Disconnect();
		}
	},
};
