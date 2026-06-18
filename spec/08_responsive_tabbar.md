# Spec 08 — Responsive Layout con Tabbar Mobile

## Objetivo

Implementar un diseño responsive donde en mobile (< 768px) el Sidebar desaparece y es reemplazado por un **Tabbar fijo en la parte inferior de la pantalla** con los ítems de navegación principales. En desktop (≥ 768px) el Sidebar se mantiene sin cambios.

---

## Impacto Arquitectural

| Componente | Impacto |
|---|---|
| `MainLayout.tsx` | Coordina visibilidad condicional Sidebar/Tabbar y eleva el estado del modal de creación. Agrega `padding-bottom` en mobile para que el contenido no quede tapado por el Tabbar fijo. |
| `Sidebar.tsx` | Se oculta en mobile (`hidden md:flex`). Pierde el estado local del modal de creación (se eleva a MainLayout) y del dark mode (se extrae a hook). Recibe `onCreateActivity` como prop. |
| `Tabbar.tsx` (nuevo) | Componente de navegación inferior para mobile. Contiene los 5 ítems principales: Home, Today, acción central (+), This Week, Projects. Recibe `onCreateActivity` como prop y consume `useDarkMode`. |
| `useDarkMode.ts` (nuevo) | Hook extraído de Sidebar que encapsula el estado del tema y la función toggle, permitiendo que ambos componentes de layout lo compartan sin duplicar lógica. |
| `Modal.tsx` | Solo verificación: confirmar que el z-index es suficiente para renderizarse por encima del Tabbar fijo. No se espera edición. |
| Páginas con listas largas | Solo verificación: confirmar que el `padding-bottom` del layout cubre el Tabbar en todas las rutas con scroll. No se espera edición. |

---

## Fase 1 — Extraer el estado de dark mode a un hook reutilizable

**Objetivo:** Desacoplar la lógica de dark mode del Sidebar para que pueda ser consumida por el Sidebar en desktop y por el Tabbar en mobile sin duplicar código.

**Pasos:**
1. Identificar en `Sidebar.tsx` el estado local de dark mode: el `useState`, la lectura inicial desde `document.documentElement`, la función `toggleDark`, y la escritura en `localStorage`.
2. Crear `hooks/useDarkMode.ts` que encapsula ese estado y lógica. El hook debe exponer el valor actual (`dark: boolean`) y la función `toggleDark`.
3. Reemplazar en `Sidebar.tsx` el estado local de dark mode por una llamada al nuevo hook `useDarkMode`.
4. Verificar que el comportamiento del toggle en desktop no cambia tras la refactorización.

**Archivos:**
- Crear: `frontend/src/hooks/useDarkMode.ts`
- Editar: `frontend/src/components/layout/Sidebar.tsx`

---

## Fase 2 — Crear el componente Tabbar

**Objetivo:** Construir el componente de navegación inferior para mobile con las acciones principales, siguiendo el sistema de diseño existente.

**Pasos:**
1. Definir los ítems del Tabbar: Home (`/`), Today (`/activities/today`), botón central de creación (`+`), This Week (`/activities/this-week`), Projects (`/projects`). El toggle de dark mode se incorpora como quinto ítem reemplazando o acompañando a "Projects", o como ícono dentro de ese tab.
2. Crear `components/layout/Tabbar.tsx`. El contenedor debe ser `fixed bottom-0 w-full` con fondo `bg-white dark:bg-gray-800` y borde superior `border-t border-gray-200 dark:border-gray-700`.
3. Implementar cada tab de navegación como `NavLink` de React Router con los mismos tokens de color activo/inactivo que usa el Sidebar (`bg-blue-700 text-white` activo, `text-gray-600` inactivo), pero en orientación vertical (ícono arriba, etiqueta abajo).
4. El botón central (`+`) es un botón de acción que recibe una prop `onCreateActivity` para disparar el modal — no es un NavLink.
5. Los íconos deben tener tamaño mínimo de 24px para área táctil adecuada. Reutilizar los mismos íconos SVG que ya usa el Sidebar.
6. Importar y usar `useDarkMode` para el toggle de tema.
7. El tab de Projects debe marcarse activo también cuando la ruta activa es `/projects/:id` (ruta hija de proyectos).

**Archivos:**
- Crear: `frontend/src/components/layout/Tabbar.tsx`

---

## Fase 3 — Actualizar MainLayout para coordinar ambos layouts

**Objetivo:** Hacer que Sidebar aparezca solo en desktop y Tabbar solo en mobile, con el ajuste de padding correcto para el contenido principal.

**Pasos:**
1. Elevar a `MainLayout.tsx` el estado del modal de crear actividad y la importación de `CreateActivityModal` (actualmente viven dentro de `Sidebar.tsx`).
2. Pasar `onCreateActivity` como prop a `Sidebar` y a `Tabbar`.
3. Agregar en `Sidebar.tsx` las clases responsive para ocultarse en mobile: el `<aside>` debe usar `hidden md:flex`.
4. Importar y renderizar `Tabbar` en `MainLayout`, visible solo en mobile mediante `block md:hidden`.
5. Agregar `pb-16 md:pb-0` al elemento `<main>` para que el contenido no quede tapado por el Tabbar fijo en mobile.
6. Verificar que el `Outlet` sigue renderizando correctamente en ambos breakpoints.

**Archivos:**
- Editar: `frontend/src/components/layout/MainLayout.tsx`
- Editar: `frontend/src/components/layout/Sidebar.tsx`

---

## Fase 4 — Dark mode accesible en mobile

**Objetivo:** Garantizar que el toggle de dark mode sea accesible desde el Tabbar en mobile, usando el mismo estado que en desktop.

**Pasos:**
1. Confirmar la ubicación del toggle de dark mode dentro del Tabbar (definida en Fase 2). Las opciones son: quinto ítem con ícono de sol/luna, o ícono adicional integrado en el tab de Settings/Profile si se agrega en el futuro.
2. Verificar que el hook `useDarkMode` (creado en Fase 1) es consumido correctamente tanto en Sidebar como en Tabbar.
3. Confirmar que el estado persiste en `localStorage` con la clave `color-theme` y que ambos componentes reflejan el mismo valor al cambiar el tema.

**Archivos:**
- Editar: `frontend/src/components/layout/Tabbar.tsx` (ajustes del toggle si es necesario)

---

## Fase 5 — QA visual y ajustes finales

**Objetivo:** Verificar que no hay regresiones en desktop y que la experiencia mobile es correcta en todas las rutas.

**Pasos:**
1. Desktop (≥ 768px): Sidebar visible, Tabbar oculto, modal de crear actividad funciona desde el Sidebar, dark mode funciona.
2. Mobile (< 768px): Sidebar oculto, Tabbar visible al fondo, todos los NavLinks navegan correctamente, botón `+` abre el modal, dark mode toggle funciona.
3. Verificar que el modal `CreateActivityModal` se renderiza sobre el Tabbar (z-index correcto — el modal debe estar por encima del `fixed bottom` del Tabbar).
4. Verificar que el contenido de cada página no queda tapado por el Tabbar en rutas con scroll largo (OverdueView, BacklogView, ProjectDetail, ProjectList).
5. Verificar que el indicador de ruta activa en el Tabbar funciona correctamente para rutas dinámicas (`/projects/:id` debe marcar activo el tab de Projects).
6. Revisar `Modal.tsx` para confirmar z-index suficiente — no se espera edición.

**Archivos a revisar (sin edición esperada):**
- `frontend/src/components/Modal.tsx`
- Páginas con listas largas: `OverdueView.tsx`, `BacklogView.tsx`, `ProjectDetail.tsx`, `ProjectList.tsx`

---

## Orden de ejecución

Las fases deben ejecutarse en el orden definido:

1. **Fase 1** es prerequisito de Fases 2, 3 y 4 — el hook `useDarkMode` debe existir antes de ser importado.
2. **Fase 2** es prerequisito de Fase 3 — `MainLayout` necesita importar `Tabbar`.
3. **Fase 3** completa la coordinación necesaria para que Fase 4 tenga sentido visual.
4. **Fase 4** puede ejecutarse en paralelo con los pasos de Fase 3 una vez que `useDarkMode` existe.
5. **Fase 5** solo puede ejecutarse con las cuatro anteriores completas.

---

## Archivos a crear

| Archivo | Acción |
|---|---|
| `frontend/src/hooks/useDarkMode.ts` | Crear |
| `frontend/src/components/layout/Tabbar.tsx` | Crear |

## Archivos a editar

| Archivo | Cambio principal |
|---|---|
| `frontend/src/components/layout/Sidebar.tsx` | Usar `useDarkMode`, recibir `onCreateActivity` como prop, agregar `hidden md:flex` |
| `frontend/src/components/layout/MainLayout.tsx` | Elevar estado del modal, renderizar `Tabbar` en mobile, agregar `pb-16 md:pb-0` al `<main>` |
| `frontend/src/components/layout/Tabbar.tsx` | Agregar toggle de dark mode |
