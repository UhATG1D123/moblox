import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import Countdown from '@/components/Countdown';
import RetryRestrictionCheck from '@/components/RetryRestrictionCheck';

const utc = (value) => value ? new Date(value).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC') : 'Not available';

export default async function NotApproved() {
  const { me, restriction, restrictionError } = await getSession();
  if (!me) redirect('/login');

  if (restrictionError) {
    return <section className="restriction-card"><p className="eyebrow">Account status</p><h1>We couldn’t verify your account status</h1><p>Moblox could not safely confirm whether your account is in good standing. Your account access is temporarily paused while we retry the check. This does not mean your account has been banned.</p><RetryRestrictionCheck /><form action="/auth/signout" method="post"><button className="btn" type="submit">Log out</button></form></section>;
  }

  if (!restriction) {
    return <section className="restriction-card"><p className="eyebrow">Account status</p><h1>Your account is in good standing</h1><p>No active account restriction was found. You can return to Moblox.</p><Link className="btn primary" href="/">Return to Moblox</Link></section>;
  }

  const kind = restriction.kind;
  const terminated = kind === 'terminated';
  const suspended = kind === 'suspended';
  const temporaryBan = kind === 'banned' && !!restriction.expires_at;
  const title = terminated ? 'Account Terminated' : suspended ? 'Account Suspended' : temporaryBan ? 'Temporary Ban' : 'Account Banned';

  return <section className="restriction-card">
    <p className="eyebrow">Moblox moderation</p><h1>{title}</h1>
    {terminated ? <p>Your Moblox account has been permanently terminated and cannot be reactivated automatically.</p> : suspended ? <p>Your account has been suspended. While the suspension is active, you cannot use the site.</p> : temporaryBan ? <p>Your account has received a temporary ban. Access is expected to return automatically when the timer expires, unless the restriction is changed by staff.</p> : <p>Your account has been banned and access will remain restricted until staff review it.</p>}
    <dl className="restriction-details">
      <div><dt>Reason</dt><dd>{restriction.reason || 'No reason was provided.'}</dd></div>
      {restriction.category && <div><dt>Rule / category</dt><dd>{restriction.category}</dd></div>}
      <div><dt>Issued (UTC)</dt><dd>{utc(restriction.issued_at)}</dd></div>
      {restriction.expires_at && <div><dt>Expires (UTC)</dt><dd>{utc(restriction.expires_at)}</dd></div>}
    </dl>
    {!terminated && restriction.expires_at && <Countdown expiresAt={restriction.expires_at} serverNow={restriction.server_now} />}
    {!terminated && <p>If you believe this action was made in error, contact Moblox support and include your username and the details shown above.</p>}
    <div className="restriction-actions"><form action="/auth/signout" method="post"><button className="btn" type="submit">Log out</button></form>{!terminated && <a className="btn" href="mailto:support@moblox.xyz?subject=Moblox%20moderation%20appeal">Contact support</a>}</div>
  </section>;
}
