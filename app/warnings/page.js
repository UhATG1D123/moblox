import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import WarningAcknowledgment from '@/components/WarningAcknowledgment';

const when = (value) => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date unavailable';

export default async function WarningsPage() {
  const { me, warnings, restriction, restrictionError } = await getSession();
  if (!me) redirect('/login');
  if (restriction || restrictionError) redirect('/not-approved');

  return <section className="warnings-page">
    <p className="eyebrow">Account notices</p>
    <h1>Account warnings</h1>
    <p className="muted">Warnings explain moderation actions taken on your account. Acknowledging a warning confirms that you have reviewed it; it does not mean you agree with it.</p>
    {!warnings.length ? <div className="panel"><h2>All caught up</h2><p>You have no warnings waiting for acknowledgment.</p><Link className="btn primary" href="/">Return to Moblox</Link></div> : <div className="warning-list">{warnings.map((warning) => <article className="panel warning-item" key={warning.id}>
      <div className="warning-heading"><h2>Account warning</h2><time>{when(warning.created_at)}</time></div>
      <p className="warning-reason">{warning.reason || 'No reason was provided.'}</p>
      <WarningAcknowledgment warningId={warning.id} />
    </article>)}</div>}
  </section>;
}
