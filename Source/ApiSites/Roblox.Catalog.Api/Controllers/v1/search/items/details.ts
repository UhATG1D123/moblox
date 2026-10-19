import { Request, Response } from 'express';
import axios from 'axios';

export default {
	method: 'all',
	func: async (request: Request, response: Response) => {
		if (request.method === 'OPTIONS') return response.send();
		try {
			const requestHeaders = Object.fromEntries(
				Object.entries(request.headers).filter(([, value]) => typeof value === 'string'),
			) as Record<string, string>;
			const result = await axios.get('https://catalog.roblox.com' + request.url, {
				headers: { ...requestHeaders, host: 'catalog.roblox.com' },
				validateStatus: () => true,
			});
			const headers = JSON.parse(JSON.stringify(result.headers).split('roblox.com').join('sitetest4.robloxlabs.com'));
			return response.set(headers).status(result.status).send(result.data);
		} catch (_error) {
			return response.status(502).send({ errors: [{ message: 'The catalog service is temporarily unavailable.' }] });
		}
	},
};
