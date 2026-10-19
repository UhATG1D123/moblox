import { NextFunction, Request, Response } from 'express';
import LogoutController from '../../../ApiSites/Roblox.Auth.Api/Controllers/v2/logout';

export default {
	method: 'all',
	func: async (request: Request, response: Response, next: NextFunction) => {
		if (request.method === 'POST') return LogoutController.func(request, response);
		if (request.method !== 'GET') return response.status(405).send('Method not allowed');
		return response.status(200).type('html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Signing out - Moblox</title></head><body><p>Signing you out of Moblox…</p><form id="logout" method="post" action="/v2/logout"></form><script>document.getElementById('logout').submit();</script><noscript><button form="logout">Sign out</button></noscript></body></html>`);
	},
};
