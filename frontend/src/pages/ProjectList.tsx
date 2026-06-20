import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects';
import { ProjectStatus, type CreateProjectDto, type Project } from '../types';
import StatusBadge from '../components/StatusBadge';
import ProjectForm from '../components/ProjectForm';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active:    'Activo',
  inactive:  'Inactivo',
  paused:    'Pausado',
  completed: 'Completado',
};

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

export default function ProjectList() {
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const { data: projects, isLoading, isError } = useProjects(filterStatus);
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  async function handleSubmit(dto: CreateProjectDto) {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, dto });
    } else {
      await createMutation.mutateAsync(dto);
    }
    setModalOpen(false);
    setEditing(null);
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Proyectos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona y organiza tus proyectos
          </p>
        </div>
        <button
          onClick={openCreate}
          className="hidden sm:block px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
        >
          + Nuevo proyecto
        </button>
      </div>

      {/* ── Status filter tabs ── */}
      <div className="flex gap-1 flex-wrap border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setFilterStatus(undefined)}
          className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
            !filterStatus
              ? 'border-blue-700 dark:border-blue-400 text-blue-700 dark:text-blue-400 font-medium'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          Todos
        </button>
        {Object.values(ProjectStatus).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              filterStatus === s
                ? 'border-blue-700 dark:border-blue-400 text-blue-700 dark:text-blue-400 font-medium'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* ── States ── */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}
      {isError && <p className="text-sm text-red-600 dark:text-red-400">Error al cargar proyectos.</p>}
      {!isLoading && projects?.length === 0 && <EmptyState message="No hay proyectos." />}

      {/* ── Table ── */}
      {!isLoading && projects && projects.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Inicio
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Fin
                </th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/projects/${project.id}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(project.startDate).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {project.endDate
                      ? new Date(project.endDate).toLocaleDateString('es-CO')
                      : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(project)}
                        title="Editar proyecto"
                        className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-700 dark:hover:text-blue-400 px-1.5 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <EditIcon />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => setDeleting(project)}
                        title="Eliminar proyecto"
                        className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 px-1.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <TrashIcon />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit modal ── */}
      {modalOpen && (
        <Modal
          title={editing ? 'Editar proyecto' : 'Nuevo proyecto'}
          onClose={() => { setModalOpen(false); setEditing(null); }}
        >
          <ProjectForm
            initial={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            loading={createMutation.isPending || updateMutation.isPending}
          />
        </Modal>
      )}

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={!!deleting}
        title="Eliminar proyecto"
        message={`¿Eliminar el proyecto "${deleting?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (deleting) await deleteMutation.mutateAsync(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
