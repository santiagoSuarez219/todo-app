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
import { DebtsService, DebtWithRemaining } from './debts.service';
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

  @Post(':id/pay')
  @ApiOperation({
    summary: 'Pay one installment: creates an expense and increments paidInstallments',
  })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  payInstallment(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ debt: DebtWithRemaining; expenseId: string }> {
    return this.debtsService.payInstallment(id);
  }
}
