type StatCardProps = {
  title: string;
  value: string | number;
};

export default function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="border-bg-fuchsia-electric rounded-xl border-l-4 bg-white p-4 shadow-md">
      <h3 className="text-sm font-semibold text-gray-600">{title}</h3>
      <p className="text-bg-fuchsia-electric text-2xl font-bold">{value}</p>
    </div>
  );
}
