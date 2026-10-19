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
		const safeName = String(user.Name).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
		return response.status(200).type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Transactions - Moblox</title>
<style>
:root{font-family:Arial,Helvetica,sans-serif;color:#393b3d;background:#f2f4f5;color-scheme:light}*{box-sizing:border-box}body{margin:0}a{color:#0067b1;text-decoration:none}a:hover{text-decoration:underline}
.topbar{background:#fff;border-bottom:1px solid #d6d6d6;padding:13px 20px}.nav{max-width:1180px;margin:auto;display:flex;align-items:center;gap:22px;flex-wrap:wrap}.brand{font-size:23px;font-weight:bold;color:#393b3d}.nav a{font-size:14px;font-weight:600}
main{max-width:1180px;margin:28px auto;padding:0 18px}h1{font-size:30px;margin:0 0 8px}.muted{color:#777}.intro{margin:0 0 22px}.panel{background:#fff;border:1px solid #d7d7d7;border-radius:4px;padding:18px}.toolbar{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:15px}.tabs{display:flex;gap:6px;flex-wrap:wrap}.tabs button{border:1px solid #bbb;background:#f7f7f7;color:#444;border-radius:3px;padding:9px 12px;font-weight:bold;cursor:pointer}.tabs button[aria-pressed=true]{background:#0074bd;border-color:#0067a8;color:#fff}select,button{font:inherit}select{padding:9px;border:1px solid #aaa;border-radius:3px;background:#fff;color:#333}#status{padding:16px 0;color:#666}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:680px;font-size:14px}th{text-align:left;background:#f4f4f4;color:#555}th,td{padding:12px 10px;border-bottom:1px solid #e1e1e1;vertical-align:top}.amount{font-weight:bold;white-space:nowrap}.positive{color:#16833a}.negative{color:#b52b27}.detail{color:#777;font-size:12px;margin-top:4px}.loadmore{display:block;margin:18px auto 0;background:#0074bd;border:1px solid #0067a8;color:white;padding:10px 18px;border-radius:3px;font-weight:bold;cursor:pointer}.loadmore:disabled{opacity:.55}.empty{text-align:center;padding:28px;color:#666}@media(max-width:600px){.nav{gap:14px}.brand{width:100%}main{margin-top:18px}.panel{padding:12px}}
</style></head><body>
<header class="topbar"><nav class="nav"><a class="brand" href="/">Moblox</a><a href="/home">Home</a><a href="/catalog">Catalog</a><a href="/transactions" aria-current="page">Transactions</a><a href="/my/account">Settings</a><a href="/users/${UserId}/profile">Profile</a></nav></header>
<main><h1>My Transactions</h1><p class="muted intro">Transaction history for ${safeName}</p><section class="panel">
<div class="toolbar"><div class="tabs" role="group" aria-label="Transaction type"><button type="button" data-type="Purchase" aria-pressed="true">Purchases</button><button type="button" data-type="Sale" aria-pressed="false">Sales</button><button type="button" data-type="GroupPayout" aria-pressed="false">Group Payouts</button><button type="button" data-type="CurrencyPurchase" aria-pressed="false">Robux Purchases</button></div><select id="limit" aria-label="Rows per page"><option value="25">25 per page</option><option value="50">50 per page</option><option value="100">100 per page</option></select></div>
<div id="status" role="status">Loading transactions…</div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Transaction</th><th>Type</th><th>Details</th><th>Amount</th></tr></thead><tbody id="rows"></tbody></table></div><button id="more" class="loadmore" type="button" hidden>Load more</button>
</section></main>
<script>
(function(){const status=document.getElementById('status'),rows=document.getElementById('rows'),more=document.getElementById('more'),limit=document.getElementById('limit'),tabs=Array.from(document.querySelectorAll('[data-type]'));let type='Purchase',cursor='',loading=false,requestId=0;
function text(parent,tag,value,cls){const n=document.createElement(tag);n.textContent=value==null?'':String(value);if(cls)n.className=cls;parent.appendChild(n);return n;}
function date(value){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString();}
function load(reset){if(loading)return;loading=true;const id=++requestId;if(reset){cursor='';rows.replaceChildren();more.hidden=true;status.textContent='Loading transactions…';}more.disabled=true;const params=new URLSearchParams({transactionType:type,limit:limit.value});if(cursor&&!reset)params.set('cursor',cursor);
fetch('/v1/users/${UserId}/transactions?'+params.toString(),{credentials:'same-origin',headers:{Accept:'application/json'}}).then(async res=>{if(!res.ok)throw new Error('Could not load transactions (HTTP '+res.status+').');return res.json();}).then(data=>{if(id!==requestId)return;const list=Array.isArray(data.data)?data.data:(Array.isArray(data)?data:[]);list.forEach(item=>{const tr=document.createElement('tr');text(tr,'td',date(item.created||item.createdAt));const title=tr.insertCell();text(title,'div',(item.details&&item.details.name)||item.name||item.type||type);if(item.isPending)text(title,'div','Pending','detail');text(tr,'td',(item.details&&item.details.type)||item.transactionType||'Transaction');text(tr,'td',(item.agent&&item.agent.name)?'With '+item.agent.name:(item.description||'—'));const amountCell=tr.insertCell();const amount=item.currency&&item.currency.amount!=null?Number(item.currency.amount):Number(item.amount);const currency=item.currency&&item.currency.type?item.currency.type:'Robux';const value=Number.isFinite(amount)?(amount>0?'+':'')+amount.toLocaleString()+' '+currency:'—';text(amountCell,'span',value,'amount '+(Number.isFinite(amount)&&amount>0?'positive':Number.isFinite(amount)&&amount<0?'negative':''));rows.appendChild(tr);});cursor=data.nextPageCursor||'';status.textContent=list.length?'Showing '+rows.children.length+' transactions':'No transactions found for this category.';if(!rows.children.length){const tr=document.createElement('tr'),td=tr.insertCell();td.colSpan=5;td.className='empty';td.textContent='No transactions to show yet.';rows.appendChild(tr);}more.hidden=!cursor;}).catch(error=>{if(id===requestId)status.textContent=error instanceof Error?error.message:'Transaction history is temporarily unavailable.';}).finally(()=>{if(id===requestId){loading=false;more.disabled=false;}});}
tabs.forEach(tab=>tab.addEventListener('click',()=>{type=tab.dataset.type;tabs.forEach(t=>t.setAttribute('aria-pressed',String(t===tab)));load(true);}));limit.addEventListener('change',()=>load(true));more.addEventListener('click',()=>{if(cursor)load(false);});load(true);
})();
</script></body></html>`);
	},
};
