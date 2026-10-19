import { Request, Response } from 'express';
import { PartialDatabase } from '../../../../Assemblies/Mssql/Roblox.Mssql.PartialDatabase/Implementation/PartialDatabase';

export default {
	method: 'all',
	func: async (Request: Request, Response: Response) => {
		if (Request.method === 'OPTIONS') return Response.status(204).send();
		if (Request.method !== 'GET') return Response.status(405).json({ usernames: [], errors: [{ message: 'Use GET to look up usernames.' }] });

		const UsernameValue = Request.query.username ?? Request.query.Username;
		const Username = typeof UsernameValue === 'string' ? UsernameValue.trim() : '';
		if (!Username) return Response.status(200).json({ usernames: [] });
		if (Username.length > 20) return Response.status(200).json({ usernames: [] });

		const Database = new PartialDatabase('RobloxMembership', '', '');
		const [Connected, ConnectError] = await Database.Connect();
		if (!Connected) {
			console.error('[Moblox Auth] Username lookup database connection failed:', ConnectError);
			return Response.status(503).json({ usernames: [], errors: [{ message: 'Username lookup is temporarily unavailable.' }] });
		}

		try {
			const [Succeeded, QueryError, Users] = await Database.Query(
				'SELECT `Name` FROM `robloxmembership`.`user` WHERE LOWER(`Name`) = LOWER(?) LIMIT 1',
				[Username]
			);
			if (!Succeeded) {
				console.error('[Moblox Auth] Username lookup query failed:', QueryError);
				return Response.status(500).json({ usernames: [], errors: [{ message: 'We could not look up that username.' }] });
			}
			return Response.status(200).json({ usernames: Users.map((User: { Name: unknown }) => String(User.Name)) });
		} catch (ErrorValue) {
			console.error('[Moblox Auth] Username lookup failed:', ErrorValue instanceof Error ? ErrorValue.message : 'Unknown database error');
			return Response.status(500).json({ usernames: [], errors: [{ message: 'We could not look up that username.' }] });
		} finally {
			await Database.Disconnect();
		}
	},
};
