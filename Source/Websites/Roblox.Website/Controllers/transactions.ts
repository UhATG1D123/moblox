import { Request, Response } from 'express';
import { KeyValueMapping } from '../../../Assemblies/Common/Mapping/Roblox.Common.Mapping/KeyValueMapping';
import { User } from '../../../Assemblies/Platform/Membership/Roblox.Platform.Membership/User';

export default {
	method: 'all',
	func: async (request: Request, response: Response) => {
		const securityToken = KeyValueMapping.GetValueFromCookieString('.ROBLOSECURITY', request.headers.cookie);
		const user = await User.GetByCookie(securityToken);
		if (!user) {
			if (securityToken !== undefined) response.clearCookie('.ROBLOSECURITY', { path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
			return response.redirect('/Login');
		}
		const UserId = Number(user.Id);
		return response.status(200).type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Transactions - Moblox</title>
<style>
:root{color-scheme:dark;font-family:Arial,sans-serif;background:#111216;color:#f5f5f5}
body{margin:0}.wrap{max-width:960px;margin:48px auto;padding:24px}
nav{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:32px}a{color:#9bc5ff;text-decoration:none}
h1{font-size:30px;margin-bottom:8px}.muted{color:#a8abb5}
.panel{background:#1b1d24;border:1px solid #30333e;border-radius:12px;padding:22px;margin-top:24px}
#status{padding:12px 0}.entry{padding:14px 0;border-bottom:1px solid #30333e}.entry:last-child{border:0}
</style>
</head>
<body><main class="wrap">
<nav><a href="/home">Home</a><a href="/catalog">Catalog</a><a href="/my/account">Settings</a><a href="/users/${UserId}/profile">Profile</a></nav>
<h1>Transactions</h1><p class="muted">Transaction history for ${String(user.Name).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</p>
<section class="panel"><div id="status">Loading transaction history…</div><div id="entries"></div></section>
</main>
<script>
(async function(){
const status=document.getElementById('status'), entries=document.getElementById('entries');
try{
const response=await fetch('/v1/users/${UserId}/transactions?transactionType=Purchase&limit=25',{credentials:'same-origin',headers:{Accept:'application/json'}});
if(!response.ok) throw new Error('Transactions could not be loaded (HTTP '+response.status+').');
const data=await response.json();
const rows=Array.isArray(data.data)?data.data:Array.isArray(data)?data:[];
if(!rows.length){status.textContent='No transactions to show yet.';return;}
status.textContent='';
for(const item of rows){
const row=document.createElement('div');row.className='entry';
const name=document.createElement('strong');name.textContent=item.details&&item.details.name||item.name||item.type||'Transaction';
const info=document.createElement('div');info.className='muted';info.textContent=[item.created,item.createdAt,item.currency&&item.currency.amount!=null?item.currency.amount+' '+(item.currency.type||''):item.amount].filter(Boolean).join(' · ');
row.append(name,info);entries.appendChild(row);
}
}catch(error){status.textContent=error instanceof Error?error.message:'Transaction history is temporarily unavailable.';}
})();
</script></body></html>`);
	},
};
