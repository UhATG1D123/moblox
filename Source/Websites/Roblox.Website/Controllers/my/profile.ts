import { Request, Response } from 'express';
import { PartialDatabase } from '../../../../Assemblies/Mssql/Roblox.Mssql.PartialDatabase/Implementation/PartialDatabase';
import { KeyValueMapping } from '../../../../Assemblies/Common/Mapping/Roblox.Common.Mapping/KeyValueMapping';
import { User } from '../../../../Assemblies/Platform/Membership/Roblox.Platform.Membership/User';

const EscapeHtml = (Value: unknown): string => String(Value ?? '').replace(/[&<>"']/g, Character => ({
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
}[Character]));

export default {
	method: 'all',
	func: async (Request: Request, Response: Response) => {
		const SecurityToken = KeyValueMapping.GetValueFromCookieString('.ROBLOSECURITY', Request.headers.cookie);
		const AuthenticatedUser = await User.GetByCookie(SecurityToken);
		if (!AuthenticatedUser) return Response.redirect('/Login');

		if (Request.method === 'POST') {
			const UsernameValue = Request.body?.username;
			const DisplayNameValue = Request.body?.displayName;
			const DescriptionValue = Request.body?.description;
			const Username = typeof UsernameValue === 'string' ? UsernameValue.trim() : '';
			const DisplayName = typeof DisplayNameValue === 'string' ? DisplayNameValue.trim() : '';
			const Description = typeof DescriptionValue === 'string' ? DescriptionValue.trim() : '';

			if (!/^[A-Za-z0-9_]{3,20}$/.test(Username) || Username.startsWith('_') || Username.endsWith('_') || (Username.match(/_/g) || []).length > 1) {
				return Response.status(400).type('html').send('Choose a username with 3–20 letters, numbers, or at most one underscore. <a href="/my/profile">Go back</a>');
			}
			if (!DisplayName || DisplayName.length > 30) {
				return Response.status(400).type('html').send('Display name must be between 1 and 30 characters. <a href="/my/profile">Go back</a>');
			}
			if (Description.length > 1000) {
				return Response.status(400).type('html').send('Your bio must be 1000 characters or fewer. <a href="/my/profile">Go back</a>');
			}

			const Database = new PartialDatabase('RobloxMembership', '', '');
			const [Connected] = await Database.Connect();
			if (!Connected) return Response.status(503).send('Profile editing is temporarily unavailable. Please try again later.');
			try {
				const [Started, StartError] = await Database.Query('START TRANSACTION');
				if (!Started) throw new Error(StartError);

				const [DuplicateCheck, DuplicateError, ExistingUsers] = await Database.Query(
					'SELECT `Id` FROM `robloxmembership`.`user` WHERE LOWER(`Name`) = LOWER(?) AND `Id` <> ? LIMIT 1',
					[Username, AuthenticatedUser.Id]
				);
				if (!DuplicateCheck) throw new Error(DuplicateError);
				if (ExistingUsers.length > 0) {
					await Database.Query('ROLLBACK');
					return Response.status(400).type('html').send('That username is already taken. <a href="/my/profile">Go back</a>');
				}

				const [UserUpdated, UserError] = await Database.Query(
					'UPDATE `robloxmembership`.`user` SET `Name` = ?, `DisplayName` = ?, `Description` = ?, `Updated` = ? WHERE `Id` = ?',
					[Username, DisplayName, Description, new Date(), AuthenticatedUser.Id]
				);
				if (!UserUpdated) throw new Error(UserError);

				const [CredentialTableReady, CredentialTableError] = await Database.Query(
					'CREATE TABLE IF NOT EXISTS `robloxmembership`.`passwordcredential` (`UserId` INT NOT NULL, `UsernameNormalized` VARCHAR(20) NOT NULL, `PasswordSalt` CHAR(32) NOT NULL, `PasswordHash` CHAR(128) NOT NULL, `Created` DATETIME NOT NULL, PRIMARY KEY (`UserId`), UNIQUE KEY `UsernameNormalized_UNIQUE` (`UsernameNormalized`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin'
				);
				if (!CredentialTableReady) throw new Error(CredentialTableError);
				const [CredentialUpdated, CredentialError] = await Database.Query(
					'UPDATE `robloxmembership`.`passwordcredential` SET `UsernameNormalized` = ? WHERE `UserId` = ?',
					[Username.toLowerCase(), AuthenticatedUser.Id]
				);
				if (!CredentialUpdated) throw new Error(CredentialError);

				const [Committed, CommitError] = await Database.Query('COMMIT');
				if (!Committed) throw new Error(CommitError);
				return Response.redirect(303, '/my/profile?saved=1');
			} catch (ErrorValue) {
				await Database.Query('ROLLBACK');
				console.error('[Moblox Profile] Update failed:', ErrorValue instanceof Error ? ErrorValue.message : 'Unknown error');
				return Response.status(500).type('html').send('We could not save your profile. Please try again. <a href="/my/profile">Go back</a>');
			} finally {
				await Database.Disconnect();
			}
		}

		return Response.status(200).type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Edit Profile - Moblox</title>
<style>
:root{color-scheme:dark;font-family:Arial,sans-serif;background:#111216;color:#f5f5f5}*{box-sizing:border-box}body{margin:0}header{padding:16px 24px;background:#191b22;border-bottom:1px solid #30333e}nav{max-width:850px;margin:auto;display:flex;gap:20px;flex-wrap:wrap}a{color:#9bc5ff;text-decoration:none}.wrap{max-width:850px;margin:38px auto;padding:0 18px}.panel{background:#1b1d24;border:1px solid #30333e;border-radius:14px;padding:26px}label{display:block;margin:20px 0 8px}input,textarea{width:100%;padding:12px;border:1px solid #454957;border-radius:8px;background:#111216;color:#fff;font:inherit}textarea{min-height:150px;resize:vertical}button{margin-top:22px;background:#335fff;color:#fff;border:0;border-radius:8px;padding:12px 18px;font-weight:700;cursor:pointer}.muted{color:#a8abb5;line-height:1.5}.success{color:#8fe0a3}
</style></head><body><header><nav><a href="/home">Home</a><a href="/catalog">Catalog</a><a href="/users/${AuthenticatedUser.Id}/profile">View Profile</a><a href="/my/account">Settings</a></nav></header>
<main class="wrap"><h1>Edit Profile</h1><p class="muted">Update your Moblox username, display name, and bio.</p><section class="panel">${Request.query.saved === '1' ? '<p class="success">Profile saved.</p>' : ''}
<form method="post" action="/my/profile">
<label for="username">Username</label><input id="username" name="username" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" required value="${EscapeHtml(AuthenticatedUser.Name)}"><p class="muted">3–20 letters, numbers, or at most one underscore. Usernames must be unique.</p>
<label for="displayName">Display name</label><input id="displayName" name="displayName" maxlength="30" required value="${EscapeHtml(AuthenticatedUser.DisplayName || AuthenticatedUser.Name)}">
<label for="description">Bio</label><textarea id="description" name="description" maxlength="1000" placeholder="Tell people a little about yourself…">${EscapeHtml(AuthenticatedUser.Description)}</textarea><p class="muted">Up to 1000 characters.</p>
<button type="submit">Save Changes</button></form></section></main></body></html>`);
	},
};
