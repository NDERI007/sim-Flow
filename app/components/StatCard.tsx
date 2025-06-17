type StatCardProps = {
  title: string;
  value: string | number;
};

export default function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="bg-white shadow-md p-4 rounded-xl border-l-4 border-bg-fuchsia-electric">
      <h3 className="text-sm font-semibold text-gray-600">{title}</h3>
      <p className="text-2xl font-bold text-bg-fuchsia-electric">{value}</p>
    </div>
  );
}
