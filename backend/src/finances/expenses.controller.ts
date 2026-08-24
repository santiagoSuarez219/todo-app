import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { DuplicateExpenseDto } from './dto/duplicate-expense.dto';
import { Expense } from './entities/expense.entity';
import { ExpensesQueryDto } from './dto/expenses-query.dto';

@ApiTags('finances / expenses')
@Controller('finances/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({
    summary:
      'Create a new expense: planned (plannedAmount only), executed (amount+date only) or settled (both). ' +
      'Requires at least plannedAmount or (amount and date). If budgetId is omitted and date falls in a month with an existing budget, it is auto-assigned.',
  })
  @ApiCreatedResponse({ type: Expense })
  create(@Body() dto: CreateExpenseDto): Promise<Expense> {
    return this.expensesService.create(dto);
  }

  @Post(':id/duplicate')
  @ApiOperation({
    summary:
      'Duplicate an expense to another month, copying it as-is (amount/date included if the source had them)',
  })
  @ApiCreatedResponse({ type: Expense })
  @ApiNotFoundResponse()
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicateExpenseDto,
  ): Promise<Expense> {
    return this.expensesService.duplicate(id, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'List expenses (paginated). Filters by year/month (anchored by budget, not date — see spec-034), budgetId, planned/executed status, description search.',
  })
  @ApiOkResponse({ type: [Expense] })
  findAll(@Query() query: ExpensesQueryDto): Promise<Expense[]> {
    return this.expensesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single expense by ID' })
  @ApiOkResponse({ type: Expense })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Expense> {
    return this.expensesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update an expense. An explicit budgetId (including null) always wins over auto-vínculo; changing date only re-links if the expense had no budget yet.',
  })
  @ApiOkResponse({ type: Expense })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<Expense> {
    return this.expensesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an expense' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.expensesService.remove(id);
  }
}
