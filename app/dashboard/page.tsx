import StatCard from '../components/StatCard';

export default function UserDashboard() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-fuchsia-700">Welcome Back</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Messages Sent" value="1,024" />
        <StatCard title="Remaining Quota" value="76%" />
        <StatCard title="Delivery Success Rate" value="98.2%" />
      </div>
    </div>
  );
}
