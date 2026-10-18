import Link from 'next/link';
import MoBux from './MoBux';

export default function Topbar({ me, unread = 0 }) {
  return (
    <header className="top">
      <Link href="/" className="logo">MOBLOX</Link>
      <Link href="/catalog" className="navlink">Marketplace</Link>
      <form action="/catalog" className="searchform">
        <input name="q" placeholder="Search" className="search" />
      </form>
      <div className="right">
        {me ? (
          <>
            <Link href="/notifications" className="bell" aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
                <path d="M10 20a2 2 0 0 0 4 0" />
              </svg>
              {unread > 0 && <span className="bellcount">{unread > 9 ? '9+' : unread}</span>}
            </Link>
            <Link href={`/users/${me.id}/profile`} className="who">
              <span className="av sm">{me.username[0].toUpperCase()}</span>{me.username}
            </Link>
            <span className="bal" title="Your MoBux balance"><MoBux n={me.balance} /></span>
            <form action="/auth/signout" method="post"><button className="btn">Log out</button></form>
          </>
        ) : (
          <>
            <Link className="btn" href="/login">Log In</Link>
            <Link className="btn primary" href="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </header>
  );
}
