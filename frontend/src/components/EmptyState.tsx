interface Props {
  message?: string;
}

export default function EmptyState({ message = 'No hay elementos para mostrar.' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <span className="text-4xl mb-3">○</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}
