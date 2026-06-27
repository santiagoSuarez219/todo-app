# test-002 — Implementación Frontend React + Vite + TailwindCSS

## Casos de prueba

### TC-001 — Navegación entre vistas principales
**Precondición:** App corriendo en `http://localhost:5173`. Backend activo.
**Pasos:**
1. Abrir la app en el navegador.
2. Navegar a cada sección del sidebar: Dashboard, Proyectos, Actividades, Hoy, Esta Semana, Vencidas.
**Resultado esperado:** Cada vista carga sin errores y muestra su contenido correspondiente.
**Estado:** ✅ Aprobado

### TC-002 — Crear proyecto desde ProjectList
**Precondición:** Estar en `/projects`.
**Pasos:**
1. Hacer clic en "Nuevo proyecto".
2. Completar nombre y estado, confirmar.
**Resultado esperado:** El proyecto aparece en la lista inmediatamente.
**Estado:** ✅ Aprobado

### TC-003 — Crear actividad desde ActivityList
**Precondición:** Estar en `/activities`.
**Pasos:**
1. Hacer clic en "Nueva actividad".
2. Completar nombre y campos requeridos, confirmar.
**Resultado esperado:** La actividad aparece en la lista.
**Estado:** ✅ Aprobado

### TC-004 — Editar y eliminar actividad
**Precondición:** Existe al menos una actividad.
**Pasos:**
1. Abrir ActivityCard, hacer clic en editar.
2. Modificar el nombre y guardar.
3. Eliminar la actividad confirmando el ConfirmDialog.
**Resultado esperado:** Los cambios se reflejan en tiempo real; la actividad desaparece al eliminar.
**Estado:** ✅ Aprobado

### TC-005 — Vistas filtradas (Hoy, Esta Semana, Vencidas)
**Precondición:** Existen actividades con `actionDate` en distintas fechas.
**Pasos:**
1. Navegar a `/activities/today` — verificar que solo aparecen actividades de hoy.
2. Navegar a `/activities/this-week` — verificar que aparecen actividades de la semana.
3. Navegar a `/activities/overdue` — verificar que aparecen actividades con fecha pasada.
**Resultado esperado:** Cada vista muestra únicamente las actividades correspondientes.
**Estado:** ✅ Aprobado
