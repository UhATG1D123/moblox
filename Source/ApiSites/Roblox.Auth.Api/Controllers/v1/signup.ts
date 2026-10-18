import { randomBytes, scryptSync } from 'crypto';
import { PartialDatabase } from '../../../../Assemblies/Mssql/Roblox.Mssql.PartialDatabase/Implementation/PartialDatabase';

interface ISignupRequest {
	username?: unknown;
	Username?: unknown;
	password?: unknown;
	Password?: unknown;
	birthday?: unknown;
	Birthday?: unknown;
	birthMonth?: unknown;
	birthDay?: unknown;
	birthYear?: unknown;
	gender?: unknown;
	Gender?: unknown;
	countryCode?: unknown;
	CountryCode?: unknown;
}

const CreateError = (Message: string, Code: number = 0) => ({
	errors: [{ code: Code, message: Message, userFacingMessage: Message, field: 'username' }],
});

export default {
	method: 'all',
	func: async (Request, Response) => {
		if (Request.method === 'OPTIONS') {
			return Response.status(204).send();
		}

		if (Request.method !== 'POST') {
			return Response.status(405).json(CreateError('Use POST to create an account.'));
		}

		const Body = (Request.body || {}) as ISignupRequest;
		const UsernameValue = Body.username ?? Body.Username;
		const PasswordValue = Body.password ?? Body.Password;
		const Username = typeof UsernameValue === 'string' ? UsernameValue.trim() : '';
		const Password = typeof PasswordValue === 'string' ? PasswordValue : '';

		if (!/^[A-Za-z0-9_]{3,20}$/.test(Username) || Username.startsWith('_') || Username.endsWith('_') || (Username.match(/_/g) || []).length > 1) {
			return Response.status(400).json(CreateError('Choose a username with 3–20 letters, numbers, or at most one underscore.'));
		}

		if (Password.length < 8 || Password.length > 128 || Password.trim().length === 0 || Password.toLowerCase() === Username.toLowerCase()) {
			return Response.status(400).json(CreateError('Choose a password at least 8 characters long that is not your username.'));
		}

		let BirthdayValue = Body.birthday ?? Body.Birthday;
		if (typeof BirthdayValue !== 'string' && Body.birthYear && Body.birthMonth && Body.birthDay) {
			BirthdayValue = String(Body.birthYear) + '-' + String(Body.birthMonth).padStart(2, '0') + '-' + String(Body.birthDay).padStart(2, '0');
		}
		const Birthday = typeof BirthdayValue === 'string' ? new Date(BirthdayValue) : new Date('');
		const Now = new Date();
		if (!Number.isFinite(Birthday.getTime()) || Birthday.getTime() > Now.getTime() || Birthday.getUTCFullYear() < 1900) {
			return Response.status(400).json(CreateError('Enter a valid birthday.'));
		}

		const GenderValue = Number(Body.gender ?? Body.Gender ?? 0);
		if (GenderValue !== 1 && GenderValue !== 2) {
			return Response.status(400).json(CreateError('Select a gender.'));
		}

		const Database = new PartialDatabase('RobloxMembership', '', '');
		const [Connected, ConnectError] = await Database.Connect();
		if (!Connected) {
			return Response.status(503).json(CreateError('Account creation is temporarily unavailable. Please try again.'));
		}

		let InTransaction = false;
		try {
			const [CredentialTableReady, CredentialTableError] = await Database.Query(
				'CREATE TABLE IF NOT EXISTS `robloxmembership`.`passwordcredential` (`UserId` INT NOT NULL, `UsernameNormalized` VARCHAR(20) NOT NULL, `PasswordSalt` CHAR(32) NOT NULL, `PasswordHash` CHAR(128) NOT NULL, `Created` DATETIME NOT NULL, PRIMARY KEY (`UserId`), UNIQUE KEY `UsernameNormalized_UNIQUE` (`UsernameNormalized`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin'
			);
			if (!CredentialTableReady) {
				throw new Error(CredentialTableError);
			}

			const [Started, StartError] = await Database.Query('START TRANSACTION');
			if (!Started) throw new Error(StartError);
			InTransaction = true;

			const [DuplicateCheck, DuplicateError, ExistingUsers] = await Database.Query(
				'SELECT `Id` FROM `robloxmembership`.`user` WHERE LOWER(`Name`) = LOWER(?) LIMIT 1',
				[Username]
			);
			if (!DuplicateCheck) throw new Error(DuplicateError);
			if (ExistingUsers.length > 0) {
				await Database.Query('ROLLBACK');
				InTransaction = false;
				return Response.status(400).json(CreateError('That username is already in use.'));
			}

			const [AccountInserted, AccountError, AccountResult] = await Database.Query(
				'INSERT INTO `robloxaccounting`.`account` () VALUES ()'
			);
			if (!AccountInserted) throw new Error(AccountError);
			const AccountId = Number(AccountResult.insertId);
			if (!Number.isSafeInteger(AccountId) || AccountId <= 0) throw new Error('Account creation did not return an account ID.');

			const [UserInserted, UserError, UserResult] = await Database.Query(
				'INSERT INTO `robloxmembership`.`user` (`Name`, `DisplayName`, `MembershipType`, `Description`, `Created`, `Updated`, `IsBanned`, `AgeBracket`, `Roles`, `CountryCode`, `UserAbove13`, `IsAdmin`, `AccountId`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
				[Username, Username, 'None', '', Now, Now, 0, 0, JSON.stringify([]), typeof (Body.countryCode ?? Body.CountryCode) === 'string' ? String(Body.countryCode ?? Body.CountryCode).slice(0, 8) : 'US', Birthday.getTime() <= new Date(Now.getFullYear() - 13, Now.getMonth(), Now.getDate()).getTime() ? 1 : 0, 0, AccountId]
			);
			if (!UserInserted) throw new Error(UserError);
			const UserId = Number(UserResult.insertId);
			if (!Number.isSafeInteger(UserId) || UserId <= 0) throw new Error('User creation did not return a user ID.');

			const Salt = randomBytes(16).toString('hex');
			const PasswordHash = scryptSync(Password, Salt, 64).toString('hex');
			const [CredentialInserted, CredentialError] = await Database.Query(
				'INSERT INTO `robloxmembership`.`passwordcredential` (`UserId`, `UsernameNormalized`, `PasswordSalt`, `PasswordHash`, `Created`) VALUES (?, ?, ?, ?, ?)',
				[UserId, Username.toLowerCase(), Salt, PasswordHash, Now]
			);
			if (!CredentialInserted) throw new Error(CredentialError);

			const SessionToken = randomBytes(32).toString('hex');
			const UserAgent = typeof Request.headers['user-agent'] === 'string' ? Request.headers['user-agent'].slice(0, 1024) : '';
			const [SessionInserted, SessionError] = await Database.Query(
				'INSERT INTO `robloxmembership`.`session` (`UserId`, `SessionToken`, `Location`, `UserAgent`, `Created`) VALUES (?, ?, ?, ?, ?)',
				[UserId, SessionToken, 'SignUp', UserAgent, Now]
			);
			if (!SessionInserted) throw new Error(SessionError);

			const [Committed, CommitError] = await Database.Query('COMMIT');
			if (!Committed) throw new Error(CommitError);
			InTransaction = false;

			Response.cookie('.ROBLOSECURITY', SessionToken, {
				domain: 'moblox.xyz',
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				maxAge: 7 * 24 * 60 * 60 * 1000,
			});

			return Response.status(201).json({ userId: UserId, username: Username });
		} catch {
			if (InTransaction) await Database.Query('ROLLBACK');
			return Response.status(500).json(CreateError('We could not create your account. Please try again.'));
		} finally {
			await Database.Disconnect();
		}
	},
};
