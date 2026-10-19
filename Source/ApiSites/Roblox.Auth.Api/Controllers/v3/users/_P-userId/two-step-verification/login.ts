import { Request, Response } from 'express';

export default {
	method: 'all',
	func: async (Request: Request, Response: Response) => {
		if (Request.method === 'OPTIONS') return Response.status(204).send();
		return Response.status(501).json({
			errors: [{
				code: 'TwoStepVerificationNotEnabled',
				message: 'Two-step verification is not enabled for Moblox accounts yet.',
			}],
		});
	},
};
