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
  const sevenDaySuspension = suspended && temporary;
  const permanentBan = kind === 'banned' && !temporary;
  const title = terminated
    ? 'Account Terminated'
    : sevenDaySuspension
      ? 'Account Suspended'
      : suspended
        ? 'Account Suspended'
        : permanentBan
          ? 'Account Banned'
          : temporary
            ? 'Temporary Account Restriction'
            : 'Account Restricted';
  const actionSummary = terminated
    ? 'This Moblox account has been terminated and cannot be used.'
    : temporary
      ? `Your account is suspended until ${utc(restriction.expires_at)}. You may sign in again after the restriction expires, provided no other restriction is active.`
      : permanentBan
        ? 'Your account has been banned indefinitely. This restriction does not have an automatic end date.'
        : 'Your account is restricted until Moblox staff changes the account status.';
  const cardType = terminated ? 'is-terminated' : permanentBan ? 'is-permanent-ban' : temporary ? 'is-temporary-suspension' : 'is-restricted';

  return (
    <section className={`restriction-card moderation-card ${cardType}`}>
      <div className="moderation-brand"><span className="moderation-mark">M</span><span>Moblox</span></div>
      <div className={`moderation-alert ${cardType}`}>
        <p className="eyebrow">Moblox moderation</p>
        <h1>{title}</h1>
        {permanentBan ? (
          <p>Our moderation team has banned this account because of activity that violates the Moblox Terms of Use or Community Guidelines. This ban has no scheduled expiration.</p>
        ) : sevenDaySuspension ? (
          <p>Our moderation team has temporarily suspended this account. The suspension is time-limited; review the details below to see when access is expected to be restored.</p>
        ) : terminated ? (
          <p>Our moderation team has terminated this account following a serious or repeated violation of the Moblox Terms of Use or Community Guidelines.</p>
        ) : (
          <p>Our moderation team has placed a restriction on this account. Review the details below to understand the action and its duration.</p>
        )}
      </div>
      <p className="moderation-guidance">
        {permanentBan
          ? 'If you believe this ban was issued in error, contact Moblox support and include the information from this notice.'
          : 'Please review the moderation details below. We ask all members to follow the Moblox Community Guidelines and Terms of Use.'}
      </p>
      <dl className="restriction-details moderation-details">
        <div><dt>Moderation action</dt><dd>{title}</dd></div>
        <div><dt>Moderator note</dt><dd>{restriction.reason || 'No additional note was provided.'}</dd></div>
        <div><dt>Rule / category</dt><dd>{restriction.category || 'General Community Guidelines'}</dd></div>
        <div><dt>Date of action (UTC)</dt><dd>{utc(restriction.issued_at)}</dd></div>
        {restriction.expires_at && <div><dt>{sevenDaySuspension ? 'Suspension ends (UTC)' : 'Restriction ends (UTC)'}</dt><dd>{utc(restriction.expires_at)}</dd></div>}
        {permanentBan && <div><dt>Expiration</dt><dd>No expiration date — permanent until reviewed by Moblox staff</dd></div>}
      </dl>
      {temporary && <Countdown expiresAt={restriction.expires_at} serverNow={restriction.server_now} />}
      <div className={`moderation-outcome ${cardType}`}><strong>What this means</strong><p>{actionSummary}</p></div>
      <div className="moderation-appeal">
        <h2>{permanentBan ? 'Need to appeal this ban?' : 'Think this decision was made in error?'}</h2>
        <p>Contact Moblox support and include your username and the details shown on this notice. Appeals are reviewed by the Moblox team; submitting an appeal does not guarantee that the decision will be changed.</p>
        <a className="btn primary" href="mailto:support@moblox.xyz?subject=Moblox%20moderation%20appeal">Contact Moblox support</a>
      </div>
      <div className="restriction-actions"><form action="/auth/signout" method="post"><button className="btn" type="submit">Log out</button></form></div>
    </section>
  );
}
