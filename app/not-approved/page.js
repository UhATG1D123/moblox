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
    return <section className="restriction-card"><p className="eyebrow">Moblox account moderation</p><h1>We couldn’t verify your account status</h1><p>Moblox could not safely confirm your account status. Access is paused while we retry the check. This does not mean your account has been moderated.</p><RetryRestrictionCheck /><form action="/auth/signout" method="post"><button className="btn" type="submit">Log out</button></form></section>;
  }
  if (!restriction && warnings.length > 0) return <AcknowledgeWarnings warnings={warnings} />;
  if (!restriction) return <section className="restriction-card"><p className="eyebrow">Account status</p><h1>Your account is in good standing</h1><p>No active account restriction was found. You can return to Moblox.</p><Link className="btn primary" href="/">Return to Moblox</Link></section>;

  const kind = restriction.kind;
  const terminated = kind === 'terminated';
  const suspended = kind === 'suspended';
  const temporary = !!restriction.expires_at;
  const title = terminated ? 'Account Terminated' : suspended ? 'Account Suspended' : temporary ? 'Account Banned Temporarily' : 'Account Banned';
  const actionSummary = terminated
    ? 'Your account has been terminated.'
    : temporary
      ? `Your account is restricted until ${utc(restriction.expires_at)}.`
      : 'Your account has been disabled until the restriction is lifted by Moblox staff.';
  return (
    <section className="restriction-card moderation-card">
      <div className="moderation-brand"><span className="moderation-mark">M</span><span>Moblox</span></div>
      <div className={`moderation-alert ${terminated ? 'is-terminated' : ''}`}>
        <p className="eyebrow">Account moderation notice</p>
        <h1>{title}</h1>
        <p>Our moderation team has determined that activity on your account violated the Moblox Terms of Use or Community Guidelines.</p>
      </div>
      <p className="moderation-guidance">Please review the information below. We ask all members to follow the Moblox Community Guidelines so the platform remains welcoming for everyone.</p>
      <dl className="restriction-details moderation-details">
        <div><dt>Moderation action</dt><dd>{title}</dd></div>
        <div><dt>Moderator note</dt><dd>{restriction.reason || 'No additional note was provided.'}</dd></div>
        <div><dt>Rule / category</dt><dd>{restriction.category || 'General Community Guidelines'}</dd></div>
        <div><dt>Date of action (UTC)</dt><dd>{utc(restriction.issued_at)}</dd></div>
        {restriction.expires_at && <div><dt>Restriction ends (UTC)</dt><dd>{utc(restriction.expires_at)}</dd></div>}
      </dl>
      {!terminated && restriction.expires_at && <Countdown expiresAt={restriction.expires_at} serverNow={restriction.server_now} />}
      <div className="moderation-outcome"><strong>Account status</strong><p>{actionSummary}</p></div>
      <div className="moderation-appeal">
        <h2>Think this decision was made in error?</h2>
        <p>You can contact Moblox support and include your username and the details shown on this notice. Appeals are reviewed by the Moblox team.</p>
        {!terminated && <a className="btn primary" href="mailto:support@moblox.xyz?subject=Moblox%20moderation%20appeal">Contact support about this decision</a>}
      </div>
      <div className="restriction-actions"><form action="/auth/signout" method="post"><button className="btn" type="submit">Log out</button></form></div>
    </section>
  );
}
