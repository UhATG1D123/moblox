import { Request, Response } from 'express';

export default {
	method: 'all',
	func: async (_request: Request, response: Response) => {
		return response.status(404).json({
			error: 'EndpointNotFound',
			message: 'This Moblox authentication endpoint is not implemented.',
		});
	},
};
