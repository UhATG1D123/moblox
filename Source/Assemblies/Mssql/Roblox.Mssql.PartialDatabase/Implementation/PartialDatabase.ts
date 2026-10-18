
import { Task } from '../../../../System/Threading/Task';
import { Connection, createConnection } from 'mysql';
import { PartialEntity } from './PartialEntity';

export class PartialDatabase {
	private name_: string;
	private username_: string;
	private password_: string;
	private connection_: Connection | null;
	private connected_: boolean;
	private connecting_: Promise<[boolean, string]> | null;

	public constructor(name: string, username: string, password: string) {
		this.name_ = (process.env['DB_NAME'] || name).toLowerCase();
		this.username_ = process.env['DB_USER'] || username;
		this.password_ = process.env['DB_PASSWORD'] || password;
		this.connection_ = null;
		this.connected_ = false;
		this.connecting_ = null;
	}

	private CreateConnection(): Connection {
		const useSsl: boolean =
			(process.env['DB_SSL'] || '').toLowerCase() === 'true';

		const portValue: number = process.env['DB_PORT']
			? Number.parseInt(process.env['DB_PORT'], 10)
			: 3306;

		return createConnection({
			host: process.env['DB_HOST'] || 'localhost',
			port: portValue,
			user: this.username_,
			password: this.password_,
			database: this.name_,
			ssl: useSsl
				? {
						minVersion: 'TLSv1.2',
						rejectUnauthorized: true,
					}
				: undefined,
			connectTimeout: 15000,
		});
	}

	public get IsConnected(): boolean {
		return this.connected_ && this.connection_ !== null;
	}

	public GetTable<TEntity>(
		name: string,
		primaryKey: string,
		autoIncrementPK: boolean = false,
	): [boolean, string, PartialEntity<TEntity> | null] {
		if (!this.connected_ || !this.connection_) {
			return [
				false,
				'The database has not been connected to yet.',
				null,
			];
		}

		return [
			true,
			'',
			new PartialEntity<TEntity>(
				this.name_,
				name,
				primaryKey,
				autoIncrementPK,
				this.connection_,
			),
		];
	}

	public async Connect(): Task<[boolean, string]> {
		if (this.connected_ && this.connection_) {
			return [true, ''];
		}

		if (this.connecting_) {
			return this.connecting_;
		}

		const ConnectPromise: Promise<[boolean, string]> =
			new Promise<[boolean, string]>((resolve) => {
				const ConnectionInstance: Connection = this.CreateConnection();

				this.connection_ = ConnectionInstance;
				this.connected_ = false;

				ConnectionInstance.on('error', (_error: Error) => {
					if (this.connection_ === ConnectionInstance) {
						this.connection_ = null;
						this.connected_ = false;
					}

					ConnectionInstance.destroy();
				});

				ConnectionInstance.connect((error: Error | null) => {
					if (error) {
						if (this.connection_ === ConnectionInstance) {
							this.connection_ = null;
							this.connected_ = false;
						}

						ConnectionInstance.destroy();

						resolve([
							false,
							`Cannot connect to database "${this.name_}": ${error.message}`,
						]);

						return;
					}

					this.connected_ = true;
					resolve([true, '']);
				});
			});

		this.connecting_ = ConnectPromise;

		try {
			return await ConnectPromise;
		} finally {
			if (this.connecting_ === ConnectPromise) {
				this.connecting_ = null;
			}
		}
	}

	public async Query(Sql: string, Values: unknown[] = []): Promise<[boolean, string, any]> {
		if (!this.connected_ || !this.connection_) {
			return [false, 'The database has not been connected to yet.', null];
		}

		return new Promise<[boolean, string, any]>((resolve) => {
			this.connection_!.query(Sql, Values, (ErrorValue: Error | null, Results: any) => {
				if (ErrorValue) {
					resolve([false, ErrorValue.message, null]);
					return;
				}

				resolve([true, '', Results]);
			});
		});
	}

	public async Disconnect(): Task<[boolean, string]> {
		const ConnectionInstance: Connection | null = this.connection_;

		this.connection_ = null;
		this.connected_ = false;

		if (ConnectionInstance) {
			ConnectionInstance.destroy();
		}

		return [true, ''];
	}
}
