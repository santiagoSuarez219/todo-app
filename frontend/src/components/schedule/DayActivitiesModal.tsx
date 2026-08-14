import type { Activity } from '../../types';
import Modal from '../Modal';
import EmptyState from '../EmptyState';
import ActivityCard from '../ActivityCard';

const DAY_TITLE_FMT = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

interface Props {
  date: Date;
  activities: Activity[];
  onClose: () => void;
}

export default function DayActivitiesModal({ date, activities, onClose }: Props) {
  return (
    <Modal title={DAY_TITLE_FMT.format(date)} onClose={onClose}>
      {activities.length === 0 ? (
        <EmptyState message="No hay actividades este día." />
      ) : (
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </Modal>
  );
}
