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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  DebtsService,
  DebtWithRemaining,
  PayOffResult,
  SyncBudgetItemsResult,
} from './debts.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { DebtStatus } from '../common/enums/debt-status.enum';

@ApiTags('finances / debts')
@Controller('finances/debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new debt' })
  @ApiCreatedResponse()
  create(@Body() dto: CreateDebtDto): Promise<DebtWithRemaining> {
    return this.debtsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List debts, optionally filtered by status' })
  @ApiQuery({ name: 'status', enum: DebtStatus, required: false })
  @ApiOkResponse()
  findAll(@Query('status') status?: DebtStatus): Promise<DebtWithRemaining[]> {
    return this.debtsService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single debt by ID' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DebtWithRemaining> {
    return this.debtsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a debt' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDebtDto,
  ): Promise<DebtWithRemaining> {
    return this.debtsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a debt' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.debtsService.remove(id);
  }

  @Post(':id/pay-off')
  @ApiOperation({
    summary:
      'Pay off a debt in full: removes future installment items, registers the remaining balance as an expense of the current month, and marks the debt as paid',
  })
  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  payOff(@Param('id', ParseUUIDPipe) id: string): Promise<PayOffResult> {
    return this.debtsService.payOff(id);
  }

  @Post(':id/sync-budget-items')
  @ApiOperation({
    summary:
      'Idempotently recreate any missing future installment items for a debt (e.g. after deleting one manually, or for a legacy debt)',
  })
  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  syncBudgetItems(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SyncBudgetItemsResult> {
    return this.debtsService.syncBudgetItems(id);
  }
}
