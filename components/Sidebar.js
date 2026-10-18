'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Users, Package, Store, Settings, ShieldCheck } from 'lucide-react';
import ProfileAvatar from './ProfileAvatar';

export default function Sidebar({ me, isStaff }) {
  const path = usePathname();
  const items = [
    { href: '/', label: 'Home', Icon: Home },
    ...(me ? [
      { href: `/users/${me.id}/profile`, label: 'Profile', Icon: User },
      { href: '/friends', label: 'Friends', Icon: Users },
      { href: '/inventory', label: 'Inventory', Icon: Package },
    ] : []),
    { href: '/catalog', label: 'Marketplace', Icon: Store },
    ...(me ? [{ href: '/settings', label: 'Settings', Icon: Settings }] : []),
    ...(isStaff ? [{ href: '/admin', label: 'Admin', Icon: ShieldCheck }] : []),
  ];
  const active = (h) => (h === '/' ? path === '/' : path.startsWith(h));
  return (
    <aside className="side">
      {me && (
        <div className="sidehead"><ProfileAvatar userId={me.id} username={me.username} /><b>{me.username}</b></div>
      )}
      {items.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={active(href) ? 'on' : ''}>
          <Icon size={22} strokeWidth={1.8} /> {label}
        </Link>
      ))}
    </aside>
  );
}