import { Request, Response } from 'express';
import { User } from '../../../../../../Assemblies/Platform/Membership/Roblox.Platform.Membership/User';

export default {
	method: 'all',
	func: async (request: Request, response: Response): Promise<void> => {
		const Match = request.originalUrl.match(/\/users\/(\d+)\/currency(?:\?|$)/);
		const UserId = Number(request.params['P-userId'] || Match?.[1]);
		if (!Number.isSafeInteger(UserId) || UserId < 1) {
			response.status(400).send({ errors: [{ code: 1, message: 'A valid userId is required.' }] });
			return;
		}
		const Account = await User.Get(UserId);
		if (!Account) {
			response.status(404).send({ errors: [{ code: 3, message: 'User not found.' }] });
			return;
		}
		response.send({ robux: Number.isFinite(Account.RobuxBalance) ? Account.RobuxBalance : 0 });
	},
};
