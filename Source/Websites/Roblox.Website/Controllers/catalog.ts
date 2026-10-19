import { Request, Response } from 'express';

export default {
	method: 'all',
	func: (_request: Request, response: Response) => {
		return response.status(200).type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Catalog - Moblox</title>
<style>
:root{color-scheme:dark;font-family:Arial,sans-serif;background:#111216;color:#f5f5f5}
*{box-sizing:border-box}body{margin:0}header{background:#191b22;border-bottom:1px solid #30333e;padding:16px 24px}
nav{max-width:1100px;margin:auto;display:flex;align-items:center;gap:22px;flex-wrap:wrap}nav a{color:#dce2f0;text-decoration:none}nav a:first-child{font-weight:700;font-size:22px;color:#fff}
main{max-width:1100px;margin:42px auto;padding:0 20px}h1{font-size:34px;margin:0 0 8px}.muted{color:#a8abb5;line-height:1.6}
.panel{margin-top:26px;background:#1b1d24;border:1px solid #30333e;border-radius:14px;padding:26px}
</style>
</head>
<body><header><nav><a href="/">Moblox</a><a href="/home">Home</a><a href="/catalog" aria-current="page">Catalog</a><a href="/my/account">Settings</a><a href="/transactions">Transactions</a></nav></header>
<main><h1>Catalog</h1><p class="muted">Explore the Moblox marketplace.</p>
<section class="panel"><h2>Marketplace is being set up</h2><p class="muted">The catalog page is now available, but Moblox-owned item listings and search are not connected yet. No items are being shown as available until the marketplace data is wired up.</p></section>
</main></body></html>`);
	},
};
