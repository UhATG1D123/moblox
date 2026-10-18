import { RequestHandler } from 'express-serve-static-core';

// After rename-hosts.js runs, the site code expects the hostname www.moblox.xyz
// (and api.moblox.xyz, static.moblox.xyz, ... for the other sites).
// This makes the bare domain and Render's own URL behave like www.
const PUBLIC_DOMAIN = 'moblox.xyz';
const WEB_HOST = `www.${PUBLIC_DOMAIN}`;

export function mapHost(rawHost: string | undefined): string | undefined {
	if (!rawHost) return rawHost;
	const [host] = rawHost.toLowerCase().split(':');
	if (host === PUBLIC_DOMAIN) return WEB_HOST;
	if (host.endsWith('.onrender.com')) return WEB_HOST;
	return rawHost;
}

export const HostRewrite = ((req, _res, next) => {
	const mapped = mapHost(req.headers.host);
	if (mapped) req.headers.host = mapped;
	if (req.headers['x-forwarded-host']) {
		const forwarded = mapHost(req.headers['x-forwarded-host'] as string);
		if (forwarded) req.headers['x-forwarded-host'] = forwarded;
	}
	next();
}) as RequestHandler;
