import { useEffect } from 'react';
import { useLocation, matchPath } from 'react-router-dom';

const APP_NAME = 'ToDo';

const ROUTE_TITLES: { pattern: string; label: string }[] = [
  { pattern: '/', label: 'Tareas' },
  { pattern: '/activities/today', label: 'Hoy' },
  { pattern: '/activities/this-week', label: 'Esta semana' },
  { pattern: '/activities/overdue', label: 'Vencidas' },
  { pattern: '/activities/backlog', label: 'Backlog' },
  { pattern: '/projects', label: 'Proyectos' },
  { pattern: '/projects/:id', label: 'Proyecto' },
  { pattern: '/finances', label: 'Finanzas' },
  { pattern: '/finances/expenses', label: 'Gastos' },
  { pattern: '/finances/incomes', label: 'Ingresos' },
  { pattern: '/finances/purchases', label: 'Compras' },
  { pattern: '/finances/accounts', label: 'Cuentas' },
  { pattern: '/finances/credit-cards', label: 'Tarjetas' },
  { pattern: '/finances/cdts', label: 'CDTs' },
  { pattern: '/finances/budgets', label: 'Presupuestos' },
  { pattern: '/finances/budgets/:id', label: 'Presupuesto' },
  { pattern: '/finances/debts', label: 'Deudas' },
];

export function usePageTitle() {
  const location = useLocation();

  useEffect(() => {
    const match = ROUTE_TITLES.find((route) =>
      matchPath({ path: route.pattern, end: true }, location.pathname),
    );
    document.title = match ? `${match.label} · ${APP_NAME}` : APP_NAME;
  }, [location.pathname]);
}
