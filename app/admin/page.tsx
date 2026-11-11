
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { toggleUserApprovalAction } from './actions';

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== 'ahmaddeveloper0370@gmail.com') {
    redirect('/dashboard');
  }

  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading users:', error);
  }

  return (
    <main className="min-h-screen bg-neutral-100 p-6 font-sans">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between rounded-2xl border-2 border-black bg-black p-6 text-white">
          <div>
            <h1 className="text-2xl font-black uppercase">Admin Portal</h1>
            <p className="text-xs font-bold text-red-500">
              User Approvals Management
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-black bg-white px-4 py-2 text-xs font-bold text-black hover:bg-neutral-200"
          >
            Back to Dashboard
          </a>
        </div>

        <div className="overflow-hidden rounded-2xl border-2 border-black bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="border-b-2 border-black bg-neutral-200 text-xs font-black uppercase text-black">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y border-black">
              {users?.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50">
                  <td className="p-4 font-bold">
                    {u.full_name || 'N/A'}
                  </td>

                  <td className="p-4">
                    {u.email || 'N/A'}
                  </td>

                  <td className="p-4">
                    {u.is_approved ? (
                      <span className="rounded-full border border-green-600 bg-green-100 px-2.5 py-1 text-xs font-black text-green-800">
                        Approved
                      </span>
                    ) : (
                      <span className="rounded-full border border-yellow-600 bg-yellow-100 px-2.5 py-1 text-xs font-black text-yellow-800">
                        Pending
                      </span>
                    )}
                  </td>

                  <td className="p-4 text-right">
                    {u.email !== 'ahmaddeveloper0370@gmail.com' && (
                      <form
                        action={async () => {
                          'use server';

                          await toggleUserApprovalAction(
                            u.id,
                            u.is_approved
                          );
                        }}
                      >
                        <button
                          type="submit"
                          className={`rounded-lg border-2 border-black px-3 py-1.5 text-xs font-black text-white transition ${
                            u.is_approved
                              ? 'bg-red-500 hover:bg-red-600'
                              : 'bg-green-500 hover:bg-green-600'
                          }`}
                        >
                          {u.is_approved
                            ? 'Revoke Approval'
                            : 'Approve User'}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(!users || users.length === 0) && (
            <div className="p-8 text-center text-sm font-bold text-neutral-500">
              No users found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

