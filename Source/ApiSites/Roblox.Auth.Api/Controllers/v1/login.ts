import { Request, Response } from 'express';

export default {
	method: 'all',
	func: async (_request: Request, response: Response) => {
		return response.status(410).json({
			success: false,
				error: 'This legacy authentication endpoint is disabled. Use the Moblox account pages instead.',
					signupUrl: '/account/signup',
					loginUrl: '/login',
		});
	},
};
