import { Request, Response } from 'express';
import { KeyValueMapping } from '../../../../../Assemblies/Common/Mapping/Roblox.Common.Mapping/KeyValueMapping';
import { PartialDatabase } from '../../../../../Assemblies/Mssql/Roblox.Mssql.PartialDatabase/Implementation/PartialDatabase';

export default {
	method: 'all',
	func: async (req: Request, res: Response) => {
		const SecurityToken = KeyValueMapping.GetValueFromCookieString('.ROBLOSECURITY', req.headers.cookie);
		if (!SecurityToken) {
			return res.status(401).json({ errors: [{ code: 0, message: 'You are not authenticated.' }] });
		}

		const Database = new PartialDatabase('RobloxMembership', '', '');
		const [Connected, ConnectError] = await Database.Connect();
		if (!Connected) {
			console.error('[Moblox Authenticated User] Database connection failed:', ConnectError);
			return res.status(503).json({ errors: [{ code: 0, message: 'Account information is temporarily unavailable.' }] });
		}

		try {
			const [Found, QueryError, Rows] = await Database.Query(
				'SELECT u.`Id`, u.`Name`, u.`DisplayName`, COALESCE(a.`RobuxBalance`, 0) AS `RobuxBalance` FROM `robloxmembership`.`session` s INNER JOIN `robloxmembership`.`user` u ON u.`Id` = s.`UserId` LEFT JOIN `robloxaccounting`.`account` a ON a.`Id` = u.`AccountId` WHERE s.`SessionToken` = ? LIMIT 1',
				[SecurityToken]
			);
			if (!Found) throw new Error(QueryError);
			if (!Rows || Rows.length !== 1) {
				return res.status(401).json({ errors: [{ code: 0, message: 'You are not authenticated.' }] });
			}

			return res.status(200).json({
				id: Number(Rows[0].Id),
				name: String(Rows[0].Name),
				displayName: String(Rows[0].DisplayName || Rows[0].Name),
				robuxBalance: Number(Rows[0].RobuxBalance) || 0,
			});
		} catch (ErrorValue) {
			console.error('[Moblox Authenticated User] Query failed:', ErrorValue instanceof Error ? ErrorValue.message : 'Unknown database error');
			return res.status(500).json({ errors: [{ code: 0, message: 'Account information could not be loaded.' }] });
		} finally {
			await Database.Disconnect();
		}
	},
};
