import { RequestHandler } from 'express-serve-static-core';

// Maps the public Moblox domain onto the hostnames the site code was written for.
//   moblox.xyz, www.moblox.xyz, moblox.onrender.com -> www.sitetest4.robloxlabs.com
//   api.moblox.xyz, static.moblox.xyz, ...          -> api.sitetest4.robloxlabs.com, ...
const PUBLIC_DOMAIN = 'moblox.xyz';
const INTERNAL_DOMAIN = 'sitetest4.robloxlabs.com';
const INTERNAL_WEB = `www.${INTERNAL_DOMAIN}`;

export function mapHost(rawHost: string | undefined): string | undefined {
	if (!rawHost) return rawHost;
	const [host] = rawHost.toLowerCase().split(':');
	if (host.endsWith(INTERNAL_DOMAIN)) return rawHost; // already internal
	if (host === PUBLIC_DOMAIN || host === `www.${PUBLIC_DOMAIN}`) return INTERNAL_WEB;
	if (host.endsWith(`.${PUBLIC_DOMAIN}`)) {
		const sub = host.slice(0, -(PUBLIC_DOMAIN.length + 1)); // e.g. "api"
		return `${sub}.${INTERNAL_DOMAIN}`;
	}
	if (host.endsWith('.onrender.com')) return INTERNAL_WEB; // moblox.onrender.com test URL
	return rawHost;
}

export const HostRewrite = ((req, _res, next) => {
	const mapped = mapHost(req.headers['x-forwarded-host'] as string | undefined) || mapHost(req.headers.host);
	if (mapped) {
		req.headers.host = mapped;
		if (req.headers['x-forwarded-host']) req.headers['x-forwarded-host'] = mapped;
	}
	next();
}) as RequestHandler;
