import { DFLog, DYNAMIC_LOGGROUP, FASTLOGS } from '../../../Web/Util/Roblox.Web.Util/Logging/FastLog';
import { Task } from '../../../../System/Threading/Task';
import { PartialDatabase } from '../../../Mssql/Roblox.Mssql.PartialDatabase/Implementation/PartialDatabase';
import { PartialDatabaseConditionType } from '../../../Mssql/Roblox.Mssql.PartialDatabase/Enumeration/PartialDatabaseConditionType';
import { IEmail } from '../../Credentials/Roblox.Platform.Credentials/IEmail';
import { IPassword } from '../../Credentials/Roblox.Platform.Credentials/IPassword';
import { ISession } from './ISession';
import { IUser } from './IUser';
import { UserModelBuildersClubMembershipTypeEnum } from './UserModelBuildersClubMembershipTypeEnum';

DYNAMIC_LOGGROUP('Tasks');

export class User implements IUser {
	public Id: number;
	public Name: string;
	public DisplayName: string;
	public MembershipType: UserModelBuildersClubMembershipTypeEnum;
	public SecurityToken: string;
	public Description: string;
	public Password: IPassword;
	public Created: string;
	public IsBanned: boolean;
	public Email: IEmail;
	public HasPasswordSet: boolean;
	public AgeBracket: number;
	public Roles: string[];
	public RobuxBalance: number;
	public NotificationCount: number;
	public EmailNotificationsEnabled: boolean;
	public CountryCode: string;
	public UserAbove13: boolean;
	public ThumbnailUrl: string;
	public IsAnyBuildersClubMember: boolean;
	public IsPremium: boolean;
	public ChangeUsernameEnabled: boolean;
	public IsAdmin: boolean;

	private static isConnected: boolean = false;
	private static connectionPromise: Promise<boolean> | null = null;
	private static db: PartialDatabase | null = null;

	private static async connectIfNotConnected(): Task<boolean> {
		if (this.db && this.db.IsConnected) {
			this.isConnected = true;
			return true;
		}

		this.isConnected = false;

		if (this.connectionPromise) {
			return this.connectionPromise;
		}

		const Database: PartialDatabase = new PartialDatabase('RobloxMembership', '', '');
		this.db = Database;

		const ConnectionPromise: Promise<boolean> = (async (): Promise<boolean> => {
			const [didConnect, errMessage] = await Database.Connect();

			if (!didConnect) {
				FASTLOGS(DFLog('Tasks'), '[DFLog::Tasks] Error when connecting to DB: %s', errMessage);

				if (this.db === Database) {
					this.db = null;
				}

				this.isConnected = false;
				return false;
			}

			this.isConnected = true;
			return true;
		})();

		this.connectionPromise = ConnectionPromise;

		try {
			return await ConnectionPromise;
		} finally {
			if (this.connectionPromise === ConnectionPromise) {
				this.connectionPromise = null;
			}
		}
	}

	public static async GetByCookie(Cookie: string): Task<IUser> {
		if (!(await this.connectIfNotConnected()) || !this.db) return null;

		const [, tableError, sessions] = this.db.GetTable<ISession>('session', 'Id', true);
		if (!sessions) {
			FASTLOGS(DFLog('Tasks'), '[DFLog::Tasks] Error when opening sessions table: %s', tableError);
			return null;
		}
		const [success, message, result] = await sessions.SelectKeyWhere('UserId', {
			Key: 'SessionToken',
			Condition: PartialDatabaseConditionType.Equal,
			Value: Cookie,
		});
		if (!success) {
			FASTLOGS(DFLog('Tasks'), '[DFLog::Tasks] Error when fetching user: %s', message);
			return null;
		}
		const thisSession = result.Rows[0];
		if (!thisSession) return null;
		return await this.Get(<number>thisSession.Data[0].Value);
	}

	/**
	 * Partial implementation, full implementation when DataBase is fully setup.
	 * @param {number} Id The userId.
	 * @returns {IUser} Returns an IUser.
	 */
	public static async Get(Id: number): Task<IUser> {
		if (!this.isConnected) await this.connectIfNotConnected();
		const [, tableError, users] = this.db.GetTable<IUser>('User', 'Id', true);
		if (!users) {
			FASTLOGS(DFLog('Tasks'), '[DFLog::Tasks] Error when opening users table: %s', tableError);
			return null;
		}
		const [success, message, result] = await users.SelectKeysWhere(
			[
				'Name',
				'DisplayName',
				'MembershipType',
				'Description',
				'Created',
				'IsBanned',
				'AgeBracket',
				'Roles',
				'CountryCode',
				'UserAbove13',
				'IsAdmin',
			],
			{
				Key: 'Id',
				Condition: PartialDatabaseConditionType.Equal,
				Value: Id,
			},
		);
		if (!success) {
			FASTLOGS(DFLog('Tasks'), '[DFLog::Tasks] Error when fetching user: %s', message);
			return null;
		}
		const thisUser = result.Rows[0];
		if (!thisUser) return null;

		const user = new User();
		user.Id = Id;
		user.Name = <string>thisUser.Data[0].Value;
		user.DisplayName = <string>thisUser.Data[1].Value;
		user.MembershipType = <UserModelBuildersClubMembershipTypeEnum>thisUser.Data[2].Value;
		user.Description = <string>thisUser.Data[3].Value;
		user.Created = <string>thisUser.Data[4].Value;
		user.IsBanned = <boolean>(thisUser.Data[5].Value === 1);
		user.AgeBracket = <number>thisUser.Data[6].Value;
		user.Roles = <string[]>JSON.parse(<string>thisUser.Data[7].Value);
		user.CountryCode = <string>thisUser.Data[8].Value;
		user.UserAbove13 = <boolean>(thisUser.Data[9].Value === 1);
		user.IsAdmin = <boolean>(thisUser.Data[10].Value === 1);
		return user;
	}

	/**
	 * Partial implementation, full implementation when DataBase is fully setup.
	 * @param {string} Name The userName.
	 * @returns {IUser} Returns an IUser.
	 */
	public static async GetByName(Name: string): Task<IUser> {
		if (!this.isConnected) await this.connectIfNotConnected();
		const [, , users] = this.db.GetTable<IUser>('User', 'Id', true);
		const [success, message, result] = await users.SelectKeysWhere(
			[
				'Id',
				'DisplayName',
				'MembershipType',
				'Description',
				'Created',
				'IsBanned',
				'AgeBracket',
				'Roles',
				'CountryCode',
				'UserAbove13',
				'IsAdmin',
			],
			{
				Key: 'Name',
				Condition: PartialDatabaseConditionType.Equal,
				Value: Name,
			},
		);
		if (!success) {
			FASTLOGS(DFLog('Tasks'), '[DFLog::Tasks] Error when fetching user: %s', message);
			return null;
		}
		const thisUser = result.Rows[0];
		if (!thisUser) return null;

		const user = new User();
		user.Id = <number>thisUser.Data[0].Value;
		user.Name = Name;
		user.DisplayName = <string>thisUser.Data[1].Value;
		user.MembershipType = <UserModelBuildersClubMembershipTypeEnum>thisUser.Data[2].Value;
		user.Description = <string>thisUser.Data[3].Value;
		user.Created = <string>thisUser.Data[4].Value;
		user.IsBanned = <boolean>(thisUser.Data[5].Value === 1);
		user.AgeBracket = <number>thisUser.Data[6].Value;
		user.Roles = <string[]>JSON.parse(<string>thisUser.Data[7].Value);
		user.CountryCode = <string>thisUser.Data[8].Value;
		user.UserAbove13 = <boolean>(thisUser.Data[9].Value === 1);
		user.IsAdmin = <boolean>(thisUser.Data[10].Value === 1);
		return user;
	}

	public static async CheckIfIdExists(Id: number): Task<boolean> {
		return (await this.Get(Id)) !== null;
	}

	public static async CheckIfUsernameExists(Name: string): Task<boolean> {
		return (await this.GetByName(Name)) !== null;
	}
}
