import { Routes, Route } from 'react-router-dom';
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
    </Routes>
  );
}
