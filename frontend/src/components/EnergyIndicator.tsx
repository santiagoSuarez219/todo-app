import { Energy } from '../types';

const colorMap: Record<Energy, string> = {
  [Energy.HIGH]: 'text-red-500',
  [Energy.MEDIUM]: 'text-yellow-500',
  [Energy.LOW]: 'text-green-500',
};

const dotCount: Record<Energy, number> = {
  [Energy.HIGH]: 3,
  [Energy.MEDIUM]: 2,
  [Energy.LOW]: 1,
};

interface Props {
  energy: Energy;
}

export default function EnergyIndicator({ energy }: Props) {
  const count = dotCount[energy];
  return (
    <span className={`inline-flex gap-0.5 ${colorMap[energy]}`} title={`Energía: ${energy}`}>
      {Array.from({ length: 3 }).map((_, i) => (
        <span key={i} className={`text-base leading-none ${i < count ? 'opacity-100' : 'opacity-20'}`}>
          ●
        </span>
      ))}
    </span>
  );
}
