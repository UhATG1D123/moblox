import Link from 'next/link';

export default function Verified() {
  return (
    <div className="authbox">
      <div style={{ fontSize: 42, marginBottom: 12 }}>✓</div>
      <h1>Account Verified</h1>
      <p>Your email address has been confirmed successfully. Your Moblox account is ready to use.</p>
      <p><Link className="btn primary" href="/login">Continue to Log In</Link></p>
      <p className="muted"><Link href="/">Return to Moblox</Link></p>
    </div>
  );
}
