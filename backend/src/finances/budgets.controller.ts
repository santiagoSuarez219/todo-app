import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { Budget } from './entities/budget.entity';
import { BudgetItem } from './entities/budget-item.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('finances / budgets')
@Controller('finances/budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new budget (optionally with items)' })
  @ApiCreatedResponse({ type: Budget })
  create(@Body() dto: CreateBudgetDto): Promise<Budget> {
    return this.budgetsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List budgets, optionally filtered by year and/or month' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiOkResponse({ type: [Budget] })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @Query('month', new ParseIntPipe({ optional: true })) month?: number,
  ): Promise<Budget[]> {
    return this.budgetsService.findAll(pagination, year, month);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget by ID (includes items)' })
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a budget (cascades to items)' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.budgetsService.remove(id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add an item to a budget' })
  @ApiCreatedResponse({ type: BudgetItem })
  @ApiNotFoundResponse()
  addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBudgetItemDto,
  ): Promise<BudgetItem> {
    return this.budgetsService.addItem(id, dto);
  }

  @Delete(':budgetId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an item from a budget' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  removeItem(
    @Param('budgetId', ParseUUIDPipe) budgetId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    return this.budgetsService.removeItem(budgetId, itemId);
  }
}
