import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/session';
import RpcForm from '@/components/RpcForm';
import ResolveReport from '@/components/ResolveReport';
import Badges from '@/components/Badges';

const CATS = ['Hats', 'Hair', 'Faces', 'Clothing', 'Accessories'].map((c) => ({ v: c, l: c }));
const one = (v) => (Array.isArray(v) ? v[0] : v);
const clean = (v, n) => String(one(v) ?? '').trim().slice(0, n).replace(/[%_,()*\\]/g, ' ').trim();
const when = (d) => new Date(d).toLocaleString('en-US');

export default async function Admin({ searchParams }) {
  const { sb, me, perms, isStaff } = await getSession();
  if (!isStaff) notFound();
  const isOwner = perms.includes('*');
  const q = clean(searchParams.q, 30);
  const a = clean(searchParams.a, 40);
  const lookupId = Number.parseInt(one(searchParams.user), 10);

  const count = async (t, f) => {
    let r = sb.from(t).select('*', { count: 'exact', head: true });
    if (f) r = f(r);
    return (await r).count || 0;
  };
  const [users, items, openReports, warnCount] = await Promise.all([
    count('profiles'), count('items'), count('reports', (r) => r.eq('status', 'open')), count('warnings'),
  ]);
  let uq = sb.from('profiles').select('id,username,balance,status,created_at,roles(name)').order('id', { ascending: false }).limit(25);
  if (q) uq = uq.ilike('username', `%${q}%`);
  let aq = sb.from('audit_log').select('id,admin_id,action,target,reason,created_at').order('id', { ascending: false }).limit(50);
  if (a) aq = aq.or(`action.ilike.%${a}%,target.ilike.%${a}%,reason.ilike.%${a}%`);

  const [{ data: userRows }, { data: reports }, { data: audit }, { data: sales }, { data: allItems }, detailRes] = await Promise.all([
    uq,
    sb.from('reports').select('id,item_id,reported_user_id,reporter_id,reason,created_at').eq('status', 'open').order('id', { ascending: false }).limit(20),
    aq,
    sb.from('ledger').select('id,profile_id,amount,item_id,created_at').eq('kind', 'purchase').order('id', { ascending: false }).limit(8),
    sb.from('items').select('id,name,published,price').order('id', { ascending: false }).limit(25),
    Number.isSafeInteger(lookupId) && lookupId > 0 ? sb.rpc('admin_user_detail', { p_target: lookupId }) : Promise.resolve({ data: null }),
  ]);
  const detail = detailRes.data;

  return (
    <>
      <h1>Admin</h1>
      <p className="muted">Signed in as {me.username} ({me.roles?.name}). Every action below is checked and logged by the database.</p>
      <div className="stats">
        <div className="stat"><b>{users}</b>Users</div>
        <div className="stat"><b>{items}</b>Items</div>
        <div className="stat"><b>{openReports}</b>Open reports</div>
        <div className="stat"><b>{warnCount}</b>Warnings issued</div>
      </div>

      <h2 id="lookup">User lookup</h2>
      <form method="get" className="filters">
        <input name="user" type="number" min="1" defaultValue={Number.isSafeInteger(lookupId) ? lookupId : ''} placeholder="User ID" />
        <button className="btn primary">Look up</button>
      </form>
      {Number.isSafeInteger(lookupId) && !detail && <p className="muted">No user with that ID.</p>}
      {detail && (
        <div className="panel">
          <h3>{detail.display_name} <Badges badges={detail.badges} size={18} /></h3>
          <p className="muted">
            @{detail.username} &middot; ID {detail.id} &middot; {detail.role} &middot; {detail.status}
            {detail.status_until ? ` until ${when(detail.status_until)}` : ''}
          </p>
          <div className="chips">
            <span className="chip">{detail.balance} MoBux</span>
            <span className="chip">{detail.friend_count} friends</span>
            <span className="chip">{detail.profile_views} views</span>
            <span className="chip">{detail.reports_against} reports against</span>
            <Link className="chip" href={`/users/${detail.id}/profile`}>Open profile</Link>
          </div>
          <h4>Warnings ({detail.warnings.length})</h4>
          {detail.warnings.length === 0 ? <p className="muted">None.</p> : (
            <table className="tbl"><tbody>{detail.warnings.map((w) => (
              <tr key={w.id}><td>{when(w.created_at)}</td><td>Admin {w.admin_id}</td><td>{w.reason}</td></tr>
            ))}</tbody></table>
          )}
          <h4>Audit history</h4>
          {detail.audit.length === 0 ? <p className="muted">No admin actions on this user.</p> : (
            <table className="tbl"><tbody>{detail.audit.map((x) => (
              <tr key={x.id}><td>{when(x.created_at)}</td><td>Admin {x.admin_id}</td><td>{x.action}</td><td>{x.reason}</td></tr>
            ))}</tbody></table>
          )}
        </div>
      )}

      <h2>Users</h2>
      <form method="get" className="filters"><input name="q" defaultValue={q} placeholder="Search username" /><button className="btn">Search</button></form>
      <table className="tbl"><thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Status</th><th>MoBux</th><th></th></tr></thead>
        <tbody>{(userRows || []).map((u) => (
          <tr key={u.id}><td>{u.id}</td><td><Link href={`/users/${u.id}/profile`}>{u.username}</Link></td><td>{u.roles?.name}</td><td>{u.status}</td><td>{u.balance}</td><td><Link href={`/admin?user=${u.id}#lookup`}>Inspect</Link></td></tr>
        ))}</tbody></table>

      <div className="forms">
        <RpcForm title="Warn a user" rpc="admin_warn" button="Issue warning" fields={[
          { name: 'id', param: 'p_target', label: 'User ID', type: 'number', required: true },
          { name: 'reason', param: 'p_reason', label: 'Reason', required: true }]} />
        <RpcForm title="Suspend / ban / reinstate" rpc="admin_set_status" button="Apply" fields={[
          { name: 'id', param: 'p_target', label: 'User ID', type: 'number', required: true },
          { name: 'status', param: 'p_status', label: 'Status', required: true, options: [{ v: 'suspended', l: 'Suspend' }, { v: 'banned', l: 'Ban' }, { v: 'active', l: 'Reinstate / unban' }] },
          { name: 'hours', param: 'p_hours', label: 'Suspend hours (optional)', type: 'number' },
          { name: 'reason', param: 'p_reason', label: 'Reason', required: true }]} />
        <RpcForm title="Adjust MoBux" rpc="admin_adjust_currency" button="Adjust" fields={[
          { name: 'id', param: 'p_target', label: 'User ID', type: 'number', required: true },
          { name: 'amount', param: 'p_amount', label: 'Amount (negative removes)', type: 'number', required: true },
          { name: 'reason', param: 'p_reason', label: 'Reason', required: true }]} />
        <RpcForm title="Badges" rpc="admin_set_badge" button="Apply badge" fields={[
          { name: 'id', param: 'p_target', label: 'User ID', type: 'number', required: true },
          { name: 'badge', param: 'p_badge', label: 'Badge', required: true, options: [{ v: 'official_admin', l: 'Official Admin' }, { v: 'verified', l: 'Verified' }] },
          { name: 'granted', param: 'p_granted', label: 'Grant (untick to remove)', type: 'checkbox' },
          { name: 'reason', param: 'p_reason', label: 'Reason', required: true }]} />
        {isOwner && (
          <RpcForm title="Set role (owner only)" rpc="admin_set_role" button="Set role" fields={[
            { name: 'id', param: 'p_target', label: 'User ID', type: 'number', required: true },
            { name: 'role', param: 'p_role_id', label: 'Role', type: 'number', required: true, options: [{ v: 2, l: 'Staff (admin group)' }, { v: 3, l: 'User' }] }]} />
        )}
      </div>

      <h2>Catalog</h2>
      <div className="forms">
        <RpcForm title="Create item" rpc="admin_save_item" button="Create" fields={[
          { name: 'name', param: 'p_name', label: 'Name', required: true },
          { name: 'description', param: 'p_description', label: 'Description' },
          { name: 'category', param: 'p_category', label: 'Category', required: true, options: CATS },
          { name: 'price', param: 'p_price', label: 'Price (MoBux)', type: 'number', required: true },
          { name: 'published', param: 'p_published', label: 'Published', type: 'checkbox' }]} />
        <RpcForm title="Publish / unpublish item" rpc="admin_set_published" button="Apply" fields={[
          { name: 'item', param: 'p_item', label: 'Item ID', type: 'number', required: true },
          { name: 'pub', param: 'p_published', label: 'Published', type: 'checkbox' },
          { name: 'reason', param: 'p_reason', label: 'Reason', required: true }]} />
      </div>
      <table className="tbl"><thead><tr><th>ID</th><th>Name</th><th>Price</th><th>Published</th></tr></thead>
        <tbody>{(allItems || []).map((i) => <tr key={i.id}><td>{i.id}</td><td><Link href={`/catalog/${i.id}`}>{i.name}</Link></td><td>{i.price}</td><td>{i.published ? 'yes' : 'no'}</td></tr>)}</tbody></table>

      <h2>Reports</h2>
      {(!reports || reports.length === 0) ? <p>No open reports.</p> : (
        <table className="tbl"><tbody>{reports.map((r) => (
          <tr key={r.id}>
            <td>#{r.id}</td>
            <td>
              {r.reported_user_id
                ? <>User <Link href={`/admin?user=${r.reported_user_id}#lookup`}>{r.reported_user_id}</Link></>
                : <>Item <Link href={`/catalog/${r.item_id}`}>{r.item_id}</Link></>}
              {' '}reported by user {r.reporter_id}: {r.reason}
            </td>
            <td><ResolveReport id={r.id} /></td>
          </tr>
        ))}</tbody></table>
      )}

      <h2>Recent purchases</h2>
      <table className="tbl"><tbody>{(sales || []).map((s) => (
        <tr key={s.id}><td>User {s.profile_id}</td><td>item {s.item_id}</td><td>{s.amount}</td><td>{when(s.created_at)}</td></tr>
      ))}</tbody></table>

      <h2>Audit log</h2>
      <form method="get" className="filters"><input name="a" defaultValue={a} placeholder="Search action, target or reason" /><button className="btn">Search</button></form>
      <table className="tbl"><thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th><th>Reason</th></tr></thead>
        <tbody>{(audit || []).map((x) => (
          <tr key={x.id}><td>{when(x.created_at)}</td><td>{x.admin_id}</td><td>{x.action}</td><td>{x.target}</td><td>{x.reason}</td></tr>
        ))}</tbody></table>
      {audit && audit.length === 0 && <p className="muted">No matching entries.</p>}
    </>
  );
}
