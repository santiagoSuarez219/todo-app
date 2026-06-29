import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity';
import { Income } from './entities/income.entity';
import { Purchase } from './entities/purchase.entity';
import { Account } from './entities/account.entity';
import { CreditCard } from './entities/credit-card.entity';
import { Cdt } from './entities/cdt.entity';
import { Budget } from './entities/budget.entity';
import { BudgetItem } from './entities/budget-item.entity';
import { ExpensesService } from './expenses.service';
import { IncomesService } from './incomes.service';
import { PurchasesService } from './purchases.service';
import { AccountsService } from './accounts.service';
import { CreditCardsService } from './credit-cards.service';
import { CdtsService } from './cdts.service';
import { BudgetsService } from './budgets.service';
import { ExpensesController } from './expenses.controller';
import { IncomesController } from './incomes.controller';
import { PurchasesController } from './purchases.controller';
import { AccountsController } from './accounts.controller';
import { CreditCardsController } from './credit-cards.controller';
import { CdtsController } from './cdts.controller';
import { BudgetsController } from './budgets.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Expense,
      Income,
      Purchase,
      Account,
      CreditCard,
      Cdt,
      Budget,
      BudgetItem,
    ]),
  ],
  providers: [
    ExpensesService,
    IncomesService,
    PurchasesService,
    AccountsService,
    CreditCardsService,
    CdtsService,
    BudgetsService,
  ],
  controllers: [
    ExpensesController,
    IncomesController,
    PurchasesController,
    AccountsController,
    CreditCardsController,
    CdtsController,
    BudgetsController,
  ],
  exports: [
    ExpensesService,
    IncomesService,
    PurchasesService,
    AccountsService,
    CreditCardsService,
    CdtsService,
    BudgetsService,
  ],
})
export class FinancesModule {}
