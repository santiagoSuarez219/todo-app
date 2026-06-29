import type { Purchase, PurchasePriority, PurchaseStore, PurchaseStatus } from '../../types';

const PRIORITY_LABELS: Record<PurchasePriority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

const PRIORITY_COLORS: Record<PurchasePriority, string> = {
  alta: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  media: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  baja: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
};

const STORE_LABELS: Record<PurchaseStore, string> = {
  amazon: 'Amazon',
  temu: 'Temu',
  mercadolibre: 'MercadoLibre',
  otra: 'Otra',
};

const STATUS_LABELS: Record<PurchaseStatus, string> = {
  pendiente: 'Pendiente',
  comprado: 'Comprado',
  descartado: 'Descartado',
};

const STATUS_COLORS: Record<PurchaseStatus, string> = {
  pendiente: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  comprado: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  descartado: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 line-through',
};

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
  );
}

interface Props {
  purchase: Purchase;
  onEdit: (purchase: Purchase) => void;
  onDelete: (purchase: Purchase) => void;
}

export default function PurchaseCard({ purchase, onEdit, onDelete }: Props) {
  const isDiscarded = purchase.status === 'descartado';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow ${isDiscarded ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-medium text-gray-900 dark:text-white ${isDiscarded ? 'line-through' : ''}`}>
              {purchase.description}
            </p>
            {purchase.url && (
              <a
                href={purchase.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                title="Ver producto"
              >
                <LinkIcon />
                Ver
              </a>
            )}
          </div>

          {purchase.notes && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{purchase.notes}</p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[purchase.status]}`}>
              {STATUS_LABELS[purchase.status]}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[purchase.priority]}`}>
              {PRIORITY_LABELS[purchase.priority]}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {STORE_LABELS[purchase.store]}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {purchase.estimatedPrice != null && (
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
              {COP.format(purchase.estimatedPrice)}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(purchase)}
              title="Editar"
              className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400 px-1.5 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <EditIcon />
              <span>Editar</span>
            </button>
            <button
              onClick={() => onDelete(purchase)}
              title="Eliminar"
              className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 px-1.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <TrashIcon />
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
