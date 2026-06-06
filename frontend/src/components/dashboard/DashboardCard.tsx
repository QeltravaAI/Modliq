type Props = {
  title: string;
  value: string;
};

export default function DashboardCard({
  title,
  value,
}: Props) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border">
      <h2 className="text-gray-500 text-sm">
        {title}
      </h2>

      <p className="text-3xl font-bold mt-3">
        {value}
      </p>
    </div>
  );
}