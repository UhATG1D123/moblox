import { randomBytes, scrypt as Scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { PartialDatabase } from '../../../../Assemblies/Mssql/Roblox.Mssql.PartialDatabase/Implementation/PartialDatabase';

const ScryptAsync = promisify(Scrypt);

interface ILoginRequest {
	username?: unknown;
	Username?: unknown;
	password?: unknown;
	Password?: unknown;
}

const CreateError = (Message: string) => ({
	errors: [{
		code: 0,
		message: Message,
		userFacingMessage: Message,
		field: 'username',
	}],
});

export default {
	method: 'all',
	func: async (Request, Response) => {
		if (Request.method === 'OPTIONS') {
			return Response.status(204).send();
		}

		if (Request.method !== 'POST') {
			return Response.status(405).json(CreateError('Use POST to sign in.'));
		}

		const Body = (Request.body || {}) as ILoginRequest;
		const UsernameValue = Body.username ?? Body.Username;
		const PasswordValue = Body.password ?? Body.Password;

		const Username = typeof UsernameValue === 'string' ? UsernameValue.trim() : '';
		const Password = typeof PasswordValue === 'string' ? PasswordValue : '';

		if (!Username || !Password || Username.length > 20 || Password.length > 128) {
			return Response.status(400).json(CreateError('Enter a valid username and password.'));
		}

		const Database = new PartialDatabase('RobloxMembership', '', '');
		const [Connected] = await Database.Connect();

		if (!Connected) {
			return Response.status(503).json(CreateError('Sign-in is temporarily unavailable.'));
		}

		try {
			const [Found, , Credentials] = await Database.Query(
				'SELECT u.`Id`, u.`Name`, u.`IsBanned`, p.`PasswordSalt`, p.`PasswordHash` FROM `robloxmembership`.`user` u INNER JOIN `robloxmembership`.`passwordcredential` p ON p.`UserId` = u.`Id` WHERE LOWER(u.`Name`) = LOWER(?) LIMIT 1',
				[Username]
			);

			if (!Found) {
				return Response.status(500).json(CreateError('We could not sign you in. Please try again.'));
			}

			if (!Credentials || Credentials.length !== 1 || Number(Credentials[0].IsBanned) !== 0) {
				return Response.status(401).json(CreateError('Incorrect username or password.'));
			}

			const Credential = Credentials[0];
			const Salt = String(Credential.PasswordSalt);
			const StoredHash = String(Credential.PasswordHash);

			if (!/^[a-f0-9]{32}$/i.test(Salt) || !/^[a-f0-9]{128}$/i.test(StoredHash)) {
				return Response.status(401).json(CreateError('Incorrect username or password.'));
			}

			const DerivedHash = await ScryptAsync(Password, Salt, 64) as Buffer;
			const ExpectedHash = Buffer.from(StoredHash, 'hex');

			if (ExpectedHash.length !== DerivedHash.length || !timingSafeEqual(ExpectedHash, DerivedHash)) {
				return Response.status(401).json(CreateError('Incorrect username or password.'));
			}

			const SessionToken = randomBytes(32).toString('hex');
			const Now = new Date();
			const UserAgent = typeof Request.headers['user-agent'] === 'string'
				? Request.headers['user-agent'].slice(0, 1024)
				: '';

			const [SessionInserted] = await Database.Query(
				'INSERT INTO `robloxmembership`.`session` (`UserId`, `SessionToken`, `Location`, `UserAgent`, `Created`) VALUES (?, ?, ?, ?, ?)',
				[Number(Credential.Id), SessionToken, 'Login', UserAgent, Now]
			);

			if (!SessionInserted) {
				return Response.status(500).json(CreateError('We could not create your session.'));
			}

			Response.cookie('.ROBLOSECURITY', SessionToken, {
				domain: 'moblox.xyz',
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				maxAge: 7 * 24 * 60 * 60 * 1000,
			});

			return Response.status(200).json({
				userId: Number(Credential.Id),
				username: String(Credential.Name),
			});
		} catch {
			return Response.status(500).json(CreateError('We could not sign you in. Please try again.'));
		} finally {
			await Database.Disconnect();
		}
	},
};
