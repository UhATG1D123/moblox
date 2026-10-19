import { Request, Response } from 'express';
import { PartialDatabase } from '../../../Assemblies/Mssql/Roblox.Mssql.PartialDatabase/Implementation/PartialDatabase';
import { KeyValueMapping } from '../../../Assemblies/Common/Mapping/Roblox.Common.Mapping/KeyValueMapping';

export default {
	method: 'all',
	func: async (request: Request, response: Response) => {
		const SecurityToken = KeyValueMapping.GetValueFromCookieString('.ROBLOSECURITY', request.headers.cookie);
		if (!SecurityToken) return response.redirect('/Login');

		const Database = new PartialDatabase('RobloxMembership', '', '');
		const [Connected, ConnectError] = await Database.Connect();
		if (!Connected) {
			console.error('[Moblox Home] Database connection failed:', ConnectError);
			return response.status(503).send('Moblox is temporarily unavailable. Please try again shortly.');
		}

		try {
			const [SessionFound, SessionError, Sessions] = await Database.Query(
				'SELECT u.`Id`, u.`Name`, u.`DisplayName`, u.`Description`, u.`AccountId` FROM `robloxmembership`.`session` s INNER JOIN `robloxmembership`.`user` u ON u.`Id` = s.`UserId` WHERE s.`SessionToken` = ? LIMIT 1',
				[SecurityToken]
			);
			if (!SessionFound) throw new Error(SessionError);
			if (!Sessions || Sessions.length !== 1) {
				response.clearCookie('.ROBLOSECURITY', { path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
				return response.redirect('/Login');
			}

			const User = Sessions[0];
			const [ColumnFound, ColumnError, Columns] = await Database.Query(
				"SHOW COLUMNS FROM `robloxaccounting`.`account` LIKE 'RobuxBalance'"
			);
			if (!ColumnFound) throw new Error(ColumnError);
			if (!Columns || Columns.length === 0) {
				const [ColumnAdded, AddColumnError] = await Database.Query(
					'ALTER TABLE `robloxaccounting`.`account` ADD COLUMN `RobuxBalance` BIGINT NOT NULL DEFAULT 0'
				);
				if (!ColumnAdded) throw new Error(AddColumnError);
			}

			const [BalanceFound, BalanceError, Balances] = await Database.Query(
				'SELECT COALESCE(`RobuxBalance`, 0) AS `RobuxBalance` FROM `robloxaccounting`.`account` WHERE `Id` = ? LIMIT 1',
				[Number(User.AccountId)]
			);
			if (!BalanceFound) throw new Error(BalanceError);
			const RobuxBalance = Balances && Balances.length ? Number(Balances[0].RobuxBalance) || 0 : 0;

			return response.render('Home', {
				isUserAuthenicated: true,
				authenticatedUser: {
					Id: Number(User.Id),
					Name: String(User.Name),
					DisplayName: String(User.DisplayName || User.Name),
					Description: String(User.Description || ''),
					RobuxBalance,
				},
				robuxBalance: RobuxBalance,
			});
		} catch (ErrorValue) {
			console.error('[Moblox Home] Failed to load account:', ErrorValue instanceof Error ? ErrorValue.message : 'Unknown database error');
			return response.status(500).send('We could not load your Moblox account. Please try again.');
		} finally {
			await Database.Disconnect();
		}
	},
};
