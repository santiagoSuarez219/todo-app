import { Routes, Route, Outlet } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import TodayView from './pages/TodayView';
import WeekView from './pages/WeekView';
import OverdueView from './pages/OverdueView';
import BacklogView from './pages/BacklogView';
import FinancesDashboard from './pages/finances/FinancesDashboard';
import ExpensesView from './pages/finances/ExpensesView';
import IncomesView from './pages/finances/IncomesView';
import PurchasesView from './pages/finances/PurchasesView';
import AccountsView from './pages/finances/AccountsView';
import CreditCardsView from './pages/finances/CreditCardsView';
import CdtsView from './pages/finances/CdtsView';
import BudgetsView from './pages/finances/BudgetsView';
import BudgetDetailView from './pages/finances/BudgetDetailView';
import DebtsView from './pages/finances/DebtsView';

function FinancesLayout() {
  return (
    <>
      <div className="hidden md:block">
        <Outlet />
      </div>
      <div className="flex md:hidden flex-col items-center justify-center gap-4 py-20 text-center px-6">
        <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Finanzas no disponible en móvil
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Accede desde un computador para gestionar tus finanzas.
          </p>
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<ProjectList />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="activities/today" element={<TodayView />} />
        <Route path="activities/this-week" element={<WeekView />} />
        <Route path="activities/overdue" element={<OverdueView />} />
        <Route path="activities/backlog" element={<BacklogView />} />
        <Route element={<FinancesLayout />}>
          <Route path="finances" element={<FinancesDashboard />} />
          <Route path="finances/expenses" element={<ExpensesView />} />
          <Route path="finances/incomes" element={<IncomesView />} />
          <Route path="finances/purchases" element={<PurchasesView />} />
          <Route path="finances/accounts" element={<AccountsView />} />
          <Route path="finances/credit-cards" element={<CreditCardsView />} />
          <Route path="finances/cdts" element={<CdtsView />} />
          <Route path="finances/budgets" element={<BudgetsView />} />
          <Route path="finances/budgets/:id" element={<BudgetDetailView />} />
          <Route path="finances/debts" element={<DebtsView />} />
        </Route>
      </Route>
    </Routes>
  );
}
