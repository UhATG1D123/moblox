import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import PasswordForm from '@/components/PasswordForm';
import ProfileSettings from '@/components/ProfileSettings';
import ProfilePhotoUpload from '@/components/ProfilePhotoUpload';
import BlockedList from '@/components/BlockedList';

export default async function Settings() {
  const { sb, me, user } = await getSession();
  if (!me) redirect('/login');
  const [{ data: prof }, { data: blocks }, { data: pending }] = await Promise.all([
    sb.from('profiles').select('display_name,bio,privacy').eq('id', me.id).maybeSingle(),
    sb.rpc('get_my_blocks'),
    sb.from('profile_photo_requests').select('id').eq('profile_id', me.id).eq('status', 'pending').limit(1).maybeSingle(),
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
        <ProfilePhotoUpload profileId={me.id} pending={!!pending} />
        <PasswordForm />
      </div>
      <h2>Blocked users</h2>
      <BlockedList blocks={blocks || []} />
    </>
  );
}
