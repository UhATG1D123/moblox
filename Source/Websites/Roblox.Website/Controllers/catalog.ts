import { Request, Response } from 'express';

export default {
	method: 'all',
	func: (_request: Request, response: Response) => {
		return response.status(200).type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Catalog - Moblox</title>
<style>
:root{font-family:Arial,Helvetica,sans-serif;background:#f2f4f5;color:#393b3d}*{box-sizing:border-box}body{margin:0}a{color:#0067b1;text-decoration:none}a:hover{text-decoration:underline}
.topbar{background:#fff;border-bottom:1px solid #d6d6d6;padding:13px 20px}.nav{max-width:1180px;margin:auto;display:flex;align-items:center;gap:22px;flex-wrap:wrap}.brand{font-size:23px;font-weight:bold;color:#393b3d}.nav a{font-size:14px;font-weight:600}
main{max-width:1180px;margin:26px auto;padding:0 18px}h1{font-size:30px;margin:0 0 18px}.filters{display:flex;gap:10px;flex-wrap:wrap;background:#fff;border:1px solid #d7d7d7;border-radius:4px;padding:14px;margin-bottom:18px}
input,select,button{font:inherit;border:1px solid #aaa;border-radius:3px;padding:10px;background:white;color:#333}input{flex:1;min-width:170px}button{background:#0074bd;border-color:#0067a8;color:#fff;font-weight:bold;cursor:pointer}button:disabled{opacity:.55;cursor:wait}
#status{padding:14px 0;color:#666}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:14px}.item{background:#fff;border:1px solid #d7d7d7;border-radius:4px;overflow:hidden;min-width:0}.thumb{height:150px;background:#f7f7f7;display:flex;align-items:center;justify-content:center}.thumb img{max-width:100%;max-height:150px;object-fit:contain}.item-info{padding:10px}.item-name{font-size:14px;font-weight:bold;line-height:1.35;min-height:38px;overflow-wrap:anywhere}.creator{font-size:12px;color:#777;margin:6px 0}.price{font-size:13px;font-weight:bold;color:#159447}.empty{padding:28px;background:#fff;border:1px solid #ddd;text-align:center;color:#666}
@media(max-width:600px){.nav{gap:14px}.brand{width:100%}main{margin-top:18px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style></head>
<body><header class="topbar"><nav class="nav"><a class="brand" href="/">Moblox</a><a href="/home">Home</a><a href="/catalog" aria-current="page">Catalog</a><a href="/transactions">Transactions</a><a href="/my/account">Settings</a></nav></header>
<main><h1>Catalog</h1>
<form class="filters" id="search-form">
<input id="keyword" type="search" placeholder="Search the catalog" aria-label="Search the catalog" maxlength="100">
<select id="category" aria-label="Catalog category"><option value="1">Featured</option><option value="2">Collectibles</option><option value="3">Community Creations</option><option value="4">Premium</option><option value="5">Recommended</option><option value="6">Avatar Shop</option></select>
<select id="sort" aria-label="Sort items"><option value="0">Relevance</option><option value="1">Most Favorited</option><option value="2">Recently Created</option><option value="3">Price: Low to High</option><option value="4">Price: High to Low</option></select>
<button id="search-button" type="submit">Search</button></form>
<div id="status" role="status">Loading catalog…</div><section id="items" class="grid" aria-live="polite"></section>
<div style="text-align:center;padding:20px"><button id="more" type="button" hidden>Load more</button></div></main>
<script>
(function(){
 const form=document.getElementById('search-form'),keyword=document.getElementById('keyword'),category=document.getElementById('category'),sort=document.getElementById('sort'),status=document.getElementById('status'),items=document.getElementById('items'),button=document.getElementById('search-button'),more=document.getElementById('more');
 let cursor='',requestId=0;
 function addText(parent,tag,cls,value){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=value==null?'':String(value);parent.appendChild(el);return el;}
 function makeItem(item){const card=document.createElement('article');card.className='item';const link=document.createElement('a');link.href='/catalog/items/'+encodeURIComponent(item.id);link.setAttribute('aria-label',item.name||'Catalog item');const thumb=document.createElement('div');thumb.className='thumb';const img=document.createElement('img');img.loading='lazy';img.alt='';img.src='https://www.roblox.com/asset-thumbnail/image?assetId='+encodeURIComponent(item.id)+'&width=150&height=150&format=png';img.onerror=function(){this.style.display='none';};thumb.appendChild(img);link.appendChild(thumb);card.appendChild(link);const info=document.createElement('div');info.className='item-info';const name=addText(info,'div','item-name',item.name||'Untitled item');if(item.id)name.title='Item ID: '+item.id;addText(info,'div','creator',item.creatorName?'By '+item.creatorName:'Catalog item');addText(info,'div','price',item.price!=null?'R$ '+Number(item.price).toLocaleString():(item.isOffSale?'Off sale':'Price unavailable'));card.appendChild(info);return card;}
 async function load(reset){const id=++requestId;button.disabled=true;more.disabled=true;if(reset){items.replaceChildren();cursor='';more.hidden=true;status.textContent='Loading catalog…';}const params=new URLSearchParams({Category:category.value,Limit:'30',SortType:sort.value,SortAggregation:'5',IncludeNotForSale:'true'});if(keyword.value.trim())params.set('Keyword',keyword.value.trim());if(!reset&&cursor)params.set('Cursor',cursor);try{const response=await fetch('/v1/search/items/details?'+params.toString(),{credentials:'same-origin',headers:{Accept:'application/json'}});if(!response.ok)throw new Error('Catalog request failed (HTTP '+response.status+').');const data=await response.json();if(id!==requestId)return;const list=Array.isArray(data.data)?data.data:[];list.forEach(item=>items.appendChild(makeItem(item)));cursor=data.nextPageCursor||'';status.textContent=items.children.length?'Showing '+items.children.length+' items':'No items matched this search.';if(!items.children.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Try another search or category.';items.appendChild(empty);}more.hidden=!cursor;}catch(error){if(id===requestId){status.textContent=error instanceof Error?error.message:'The catalog is temporarily unavailable.';more.hidden=true;}}finally{if(id===requestId){button.disabled=false;more.disabled=false;}}}
 form.addEventListener('submit',e=>{e.preventDefault();load(true);});category.addEventListener('change',()=>load(true));sort.addEventListener('change',()=>load(true));more.addEventListener('click',()=>{if(cursor)load(false);});load(true);
})();
</script></body></html>`);
	},
};
