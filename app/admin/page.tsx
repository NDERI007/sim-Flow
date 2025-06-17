import StatCard from "../components/StatCard";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-[--fuchsia-electric]">
        Admin Dashboard
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Messages Sent" value="12,340" />
        <StatCard title="Pending Queue" value="278" />
        <StatCard title="Quota Used" value="68%" />
      </div>
    </div>
  );
}
