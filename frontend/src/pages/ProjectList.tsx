import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects';
import { ProjectStatus, type CreateProjectDto, type Project } from '../types';
import StatusBadge from '../components/StatusBadge';
import ProjectForm from '../components/ProjectForm';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

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

  async function handleDelete() {
    if (!deleting) return;
    await deleteMutation.mutateAsync(deleting.id);
    setDeleting(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Proyectos</h1>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="px-4 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          + Nuevo proyecto
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus(undefined)}
          className={`px-3 py-1 text-xs rounded-full border ${!filterStatus ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          Todos
        </button>
        {Object.values(ProjectStatus).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 text-xs rounded-full border ${filterStatus === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-gray-400">Cargando…</p>}
      {isError && <p className="text-sm text-red-500">Error al cargar proyectos.</p>}
      {projects && projects.length === 0 && <EmptyState message="No hay proyectos." />}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Nombre</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Inicio</th>
              <th className="px-4 py-3 text-left font-medium">Fin</th>
              <th className="px-4 py-3 text-left font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {projects?.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link to={`/projects/${project.id}`} className="hover:text-indigo-600">
                    {project.name}
                  </Link>
                </td>
                <td className="px-4 py-3"><StatusBadge status={project.status} /></td>
                <td className="px-4 py-3 text-gray-500">{new Date(project.startDate).toLocaleDateString('es-CO')}</td>
                <td className="px-4 py-3 text-gray-500">{project.endDate ? new Date(project.endDate).toLocaleDateString('es-CO') : '—'}</td>
                <td className="px-4 py-3 flex gap-3">
                  <button
                    onClick={() => { setEditing(project); setModalOpen(true); }}
                    className="text-indigo-600 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleting(project)}
                    className="text-red-500 hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>
            <ProjectForm
              initial={editing ?? undefined}
              onSubmit={handleSubmit}
              onCancel={() => { setModalOpen(false); setEditing(null); }}
              loading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        message={`¿Eliminar el proyecto "${deleting?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
