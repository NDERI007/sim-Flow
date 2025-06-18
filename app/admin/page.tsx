import StatCard from '../components/StatCard';
import axios from '../lib/axios';

export default function AdminDashboard() {
  const logout = async () => {
    await axios.post('/api/logout');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-black">Admin Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Messages Sent" value="12,340" />
        <StatCard title="Pending Queue" value="278" />
        <StatCard title="Quota Used" value="68%" />
        {/* Add logout button */}
        <button
          onClick={logout}
          className="mt-6 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
