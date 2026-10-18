import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import PasswordForm from '@/components/PasswordForm';
import ProfileSettings from '@/components/ProfileSettings';
import BlockedList from '@/components/BlockedList';

export default async function Settings() {
  const { sb, me, user } = await getSession();
  if (!me) redirect('/login');
  const [{ data: prof }, { data: blocks }] = await Promise.all([
    sb.from('profiles').select('display_name,bio,privacy').eq('id', me.id).maybeSingle(),
    sb.rpc('get_my_blocks'),
  ]);
  return (
    <>
      <h1>Settings</h1>
      <h2>Account info</h2>
      <p><b>Username:</b> {me.username}</p>
      <p><b>User ID:</b> {me.id}</p>
      <p><b>Email:</b> {user.email}</p>
      <p><b>Role:</b> {me.roles?.name}</p>
      <div className="forms">
        <ProfileSettings displayName={prof?.display_name} bio={prof?.bio} privacy={prof?.privacy} />
        <PasswordForm />
      </div>
      <h2>Blocked users</h2>
      <BlockedList blocks={blocks || []} />
    </>
  );
}
