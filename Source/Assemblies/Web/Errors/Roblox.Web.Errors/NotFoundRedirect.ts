import { Request, Response } from 'express';

export const NotFoundRedirect = (request: Request, response: Response) => {
	return response.redirect('https://www.moblox.xyz' + request.url);
};
