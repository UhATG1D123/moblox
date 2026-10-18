import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import PasswordForm from '@/components/PasswordForm';

export default async function Settings() {
  const { me, user } = await getSession();
  if (!me) redirect('/login');
  return (
    <>
      <h1>Settings</h1>
      <h2>Account info</h2>
      <p><b>Username:</b> {me.username}</p>
      <p><b>User ID:</b> {me.id}</p>
      <p><b>Email:</b> {user.email}</p>
      <p><b>Role:</b> {me.roles?.name}</p>
      <PasswordForm />
    </>
  );
}
