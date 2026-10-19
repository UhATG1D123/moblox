import { Request, Response } from 'express';
import { KeyValueMapping } from '../../../../../Assemblies/Common/Mapping/Roblox.Common.Mapping/KeyValueMapping';
import { User } from '../../../../../Assemblies/Platform/Membership/Roblox.Platform.Membership/User';

export default {
	method: 'all',
	func: async (req: Request, res: Response) => {
		const SecurityToken = KeyValueMapping.GetValueFromCookieString('.ROBLOSECURITY', req.headers.cookie);

		if (!SecurityToken) {
			return res.status(401).json({ errors: [{ code: 0, message: 'You are not authenticated.' }] });
		}

		const AuthenticatedUser = await User.GetByCookie(SecurityToken);

		if (!AuthenticatedUser) {
			return res.status(401).json({ errors: [{ code: 0, message: 'You are not authenticated.' }] });
		}

		return res.status(200).json({
			id: AuthenticatedUser.Id,
			name: AuthenticatedUser.Name,
			displayName: AuthenticatedUser.DisplayName,
		});
	},
};
