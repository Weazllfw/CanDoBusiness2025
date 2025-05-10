import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

// Define the list of admin emails. 
// For now, this matches the system user email you configured.
const ADMIN_EMAILS = ['rmarshall@itmarshall.net'];

export default async function AdminPage() {
  const user = await getUser();

  if (!user) {
    // If no user is logged in, redirect to login
    redirect('/auth/login');
    return null;
  }

  if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
    // If the user is logged in but their email is not in the admin list,
    // you could redirect them to a general page or show an access denied message.
    // For simplicity, redirecting to the feed page.
    console.warn(`Admin access denied for user: ${user.email}`);
    redirect('/feed'); // Or redirect to a specific "Access Denied" page
    return null;
  }

  // If the user is an admin, show the dashboard
  return (
    <div className="container mx-auto p-4 sm:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-lg text-gray-600">Welcome, {user.email}!</p>
      </header>

      <section>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Placeholder for stats or quick actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-medium text-gray-700">Users</h3>
            <p className="text-2xl font-bold text-gray-900">--</p> 
            {/* TODO: Fetch and display actual user count */}
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-medium text-gray-700">Messages</h3>
            <p className="text-2xl font-bold text-gray-900">--</p> 
            {/* TODO: Fetch and display actual message count */}
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-medium text-gray-700">System Status</h3>
            <p className="text-green-500 font-semibold">Nominal</p>
          </div>
        </div>
      </section>

      {/* TODO: Add more admin sections here, e.g.: */}
      {/* - User management table */}
      {/* - Message moderation tools */}
      {/* - System configuration settings */}
    </div>
  );
} 