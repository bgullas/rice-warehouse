interface Props {
  label: string;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'orange' | 'gray' | 'purple';
}

export default function Badge({ label, color = 'gray' }: Props) {
  const map = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    orange: 'bg-orange-100 text-orange-800',
    gray: 'bg-gray-100 text-gray-800',
    purple: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[color]}`}>
      {label}
    </span>
  );
}
