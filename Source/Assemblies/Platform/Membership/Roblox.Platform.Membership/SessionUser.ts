import { DFLog, DYNAMIC_LOGGROUP, FASTLOGS } from '../../../Web/Util/Roblox.Web.Util/Logging/FastLog';
import { Task } from '../../../../System/Threading/Task';
import { PartialDatabase } from '../../../Mssql/Roblox.Mssql.PartialDatabase/Implementation/PartialDatabase';
import { PartialDatabaseConditionType } from '../../../Mssql/Roblox.Mssql.PartialDatabase/Enumeration/PartialDatabaseConditionType';
import { ISessionUser } from './ISessionUser';

DYNAMIC_LOGGROUP('Tasks');

// TODO: Add GetOrCreateById()
export class SessionUser implements ISessionUser {
	public Id: System.Int64; // PK AI
	public IpAddress: System.String; // Implement an IpAdress interface here.
	public LanguageCode: System.String;
	public LanguageName: System.String;

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

	/**
	 * Simple implementation to fetch or, create and fetch session user from the DB, expect this to cache instead.
	 * @param {System.String} IpAddress The IP address to query by.
	 * @returns {ISessionUser} Returns null if an error occured, or an {ISessionUser} if not.
	 */
	public static async GetOrCreateByIpAddress(IpAddress: string): Task<ISessionUser> {
		if (!(await this.connectIfNotConnected()) || !this.db) return null;

		const [, tableError, sessionUsers] = this.db.GetTable<ISessionUser>('SessionUser', 'Id', true);
		if (!sessionUsers) {
			FASTLOGS(DFLog('Tasks'), '[DFLog::Tasks] Error when opening session users table: %s', tableError);
			return null;
		}
		const [success, message, result] = await sessionUsers.SelectAllWhere({
			Key: 'IpAddress',
			Condition: PartialDatabaseConditionType.Equal,
			Value: IpAddress,
		});
		if (!success) {
			FASTLOGS(DFLog('Tasks'), '[DFLog::Tasks] Error when fetching user: %s', message);
			return null;
		}
		const thisSession = result.Rows[0];
		const session = new SessionUser();
		if (!thisSession) {
			const [inserted, insertError] = await sessionUsers.InsertValues([
				{
					Key: 'IpAddress',
					Value: IpAddress,
				},
				{ Key: 'LanguageCode', Value: 'en_us' },
				{ Key: 'LanguageName', Value: 'English' },
			]);
			if (!inserted) {
				FASTLOGS(DFLog('Tasks'), '[DFLog::Tasks] Error when creating session user: %s', insertError);
				return null;
			}
			session.Id = null; // Make it null because we don't know what the Id will be.
			session.IpAddress = IpAddress;
			session.LanguageCode = 'en_us';
			session.LanguageName = 'English';
			return session;
		}
		session.Id = <number>(<unknown>thisSession.Data[0].Value);
		session.IpAddress = IpAddress;
		session.LanguageCode = <string>thisSession.Data[2].Value;
		session.LanguageName = <string>thisSession.Data[3].Value;
		return session;
	}
}
