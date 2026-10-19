import { Request, Response } from 'express';

export default {
	method: 'all',
	func: (_request: Request, response: Response) => response.redirect(302, '/my/account'),
};
