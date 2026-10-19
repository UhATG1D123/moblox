import { Request, Response } from 'express';

export default {
	method: 'all',
	func: (Request: Request, Response: Response) => {
		if (Request.method === 'OPTIONS') return Response.status(204).send();
		return Response.status(501).json({
			errors: [{
				code: 'FeatureNotEnabled',
				message: 'This authentication feature is not implemented for Moblox accounts yet.',
			}],
		});
	},
};
