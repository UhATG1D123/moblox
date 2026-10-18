import './globals.css';

export const metadata = { title: 'Moblox', description: 'Moblox - an independent avatar shop community' };

const nav = ['Home', 'Profile', 'Messages', 'Friends', 'Avatar', 'Inventory', 'Trade', 'Catalog'];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <div className="logo">MOBLOX</div>
          <a href="/">Charts</a><a href="/catalog">Marketplace</a><a href="/">Create</a>
          <input className="search" placeholder="Search" />
          <span className="bal">Demo coins: --</span>
        </header>
        <div className="shell">
          <aside className="side">
            {nav.map((n) => (
              <a key={n} href={n === 'Catalog' ? '/catalog' : '/'}>{n}</a>
            ))}
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
