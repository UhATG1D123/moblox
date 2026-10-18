import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import Countdown from '@/components/Countdown';
import RetryRestrictionCheck from '@/components/RetryRestrictionCheck';
import AcknowledgeWarnings from '@/components/AcknowledgeWarnings';

const utc = (value) => value ? new Date(value).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC') : 'Not available';

export default async function NotApproved() {
  const { me, restriction, restrictionError, warnings, warningError } = await getSession();
  if (!me) redirect('/login');
  if (restrictionError || warningError) {
    return <section className="restriction-card moderation-card"><p className="eyebrow">MOBLOX</p><h1>Can’t verify account status</h1><p>Access is paused while we retry the status check.</p><RetryRestrictionCheck /><form action="/auth/signout" method="post"><button className="btn" type="submit">Log out</button></form></section>;
  }
  if (!restriction && warnings.length > 0) return <AcknowledgeWarnings warnings={warnings} />;
  if (!restriction) return <section className="restriction-card moderation-card"><h1>Account is in good standing</h1><p>No active restriction was found.</p><Link className="btn primary" href="/">Return to Moblox</Link></section>;

  const kind = restriction.kind;
  const terminated = kind === 'terminated';
  const temporary = !!restriction.expires_at && !terminated;
  const permanentBan = !temporary;
  const durationDays = temporary
    ? Math.max(1, Math.ceil((new Date(restriction.expires_at).getTime() - new Date(restriction.issued_at || restriction.server_now || Date.now()).getTime()) / 86400000))
    : 0;
  const title = temporary ? `${durationDays} Day${durationDays === 1 ? '' : 's'} Ban` : 'Banned';
  const cardType = terminated ? 'is-terminated' : permanentBan ? 'is-permanent-ban' : 'is-temporary-suspension';

  return (
    <section className={`restriction-card moderation-card ${cardType}`}>
      <div className="moderation-brand"><span className="moderation-mark">M</span><span>Moblox</span></div>
      <div className={`moderation-alert ${cardType}`}>
        <p className="eyebrow">ACCOUNT NOTICE</p>
        <h1>{title}</h1>
        <p>{temporary
          ? 'Your account is banned for a limited time. You can sign in again after the ban expires, if no other restriction is active.'
          : 'This account has been banned from Moblox. If you believe this decision is incorrect, you can contact support.'}</p>
      </div>
      <dl className="restriction-details moderation-details moderation-compact">
        <div><dt>Reason</dt><dd>{restriction.reason || 'No reason provided.'}</dd></div>
        <div><dt>Rule</dt><dd>{restriction.category || 'Community Guidelines'}</dd></div>
        {restriction.issued_at && <div><dt>Date</dt><dd>{utc(restriction.issued_at)}</dd></div>}
        {temporary && <div><dt>Ends</dt><dd>{utc(restriction.expires_at)}</dd></div>}
        {permanentBan && <div><dt>Duration</dt><dd>Permanent</dd></div>}
      </dl>
      {temporary && <Countdown expiresAt={restriction.expires_at} serverNow={restriction.server_now} />}
      <div className="restriction-actions">
        <a className="btn primary" href="mailto:support@moblox.xyz?subject=Moblox%20moderation%20appeal">Contact support</a>
        <form action="/auth/signout" method="post"><button className="btn" type="submit">Log out</button></form>
      </div>
    </section>
  );
}
