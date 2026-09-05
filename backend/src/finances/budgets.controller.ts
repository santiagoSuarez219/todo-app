import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  BudgetsService,
  DuplicateBudgetResult,
  RemoveBudgetResult,
} from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { DuplicateBudgetDto } from './dto/duplicate-budget.dto';
import { MonthlySummaryQueryDto } from './dto/monthly-summary-query.dto';
import { MonthlySummary } from './budgets.service';
import { BudgetsQueryDto } from './dto/budgets-query.dto';
import { Budget } from './entities/budget.entity';

@ApiTags('finances / budgets')
@Controller('finances/budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({
    summary:
      'Create a new budget. Nace vacío: los gastos se agregan vía POST /finances/expenses con budgetId.',
  })
  @ApiCreatedResponse({ type: Budget })
  create(@Body() dto: CreateBudgetDto): Promise<Budget> {
    return this.budgetsService.create(dto);
  }

  @Post(':id/duplicate')
  @ApiOperation({
    summary:
      'Duplicate a budget to another month/year. Copia solo el plan de los gastos (plannedAmount) y todos los ingresos; amount/date quedan en null en el destino.',
  })
  @ApiCreatedResponse()
  @ApiNotFoundResponse({ description: 'Source budget not found' })
  @ApiConflictResponse({
    description: 'Budget already exists for destination month/year',
  })
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicateBudgetDto,
  ): Promise<DuplicateBudgetResult> {
    return this.budgetsService.duplicate(id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List budgets, optionally filtered by year and/or month',
  })
  @ApiOkResponse({ type: [Budget] })
  findAll(@Query() query: BudgetsQueryDto): Promise<Budget[]> {
    const { year, month, ...pagination } = query;
    return this.budgetsService.findAll(pagination, year, month);
  }

  @Get('monthly-summary')
  @ApiOperation({
    summary:
      'Get consolidated monthly summary: planned vs executed, variance, pending/unplanned totals and card breakdown.',
  })
  @ApiOkResponse()
  getMonthlySummary(
    @Query() query: MonthlySummaryQueryDto,
  ): Promise<MonthlySummary> {
    return this.budgetsService.getMonthlySummary(query.year, query.month);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a budget by ID (includes its expenses, planned and executed)',
  })
  @ApiOkResponse({ type: Budget })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Budget> {
    return this.budgetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget (name, month, year)' })
  @ApiOkResponse({ type: Budget })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<Budget> {
    return this.budgetsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Delete a budget. Cascades to ALL its expenses, including already executed ones (spec-035, decisión 12) — el resultado indica cuántos y por qué monto para que la UI advierta antes de confirmar.',
  })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<RemoveBudgetResult> {
    return this.budgetsService.remove(id);
  }
}
