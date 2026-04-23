import { Energy } from '../types';

const colorMap: Record<Energy, string> = {
  [Energy.HIGH]:   'text-red-500 dark:text-red-400',
  [Energy.MEDIUM]: 'text-yellow-500 dark:text-yellow-400',
  [Energy.LOW]:    'text-green-500 dark:text-green-400',
};

const labelMap: Record<Energy, string> = {
  [Energy.HIGH]:   'Alta',
  [Energy.MEDIUM]: 'Media',
  [Energy.LOW]:    'Baja',
};

const dotCount: Record<Energy, number> = {
  [Energy.HIGH]:   3,
  [Energy.MEDIUM]: 2,
  [Energy.LOW]:    1,
};

interface Props {
  energy: Energy;
}

export default function EnergyIndicator({ energy }: Props) {
  const count = dotCount[energy];
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${colorMap[energy]}`}
      title={`Energía: ${labelMap[energy]}`}
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <span key={i} className={`text-sm leading-none ${i < count ? 'opacity-100' : 'opacity-20'}`}>
          ●
        </span>
      ))}
    </span>
  );
}
