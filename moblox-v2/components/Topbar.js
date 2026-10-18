import Link from 'next/link';
import MoBux from './MoBux';

export default function Topbar({ me }) {
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
