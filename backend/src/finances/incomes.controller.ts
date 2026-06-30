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
import { IncomesService } from './incomes.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { Income } from './entities/income.entity';
import { IncomesQueryDto } from './dto/incomes-query.dto';

@ApiTags('finances / incomes')
@Controller('finances/incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new income' })
  @ApiCreatedResponse({ type: Income })
  create(@Body() dto: CreateIncomeDto): Promise<Income> {
    return this.incomesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List incomes (paginated, filtered by year/month, ordered by date DESC)' })
  @ApiOkResponse({ type: [Income] })
  findAll(@Query() query: IncomesQueryDto): Promise<Income[]> {
    return this.incomesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single income by ID' })
  @ApiOkResponse({ type: Income })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Income> {
    return this.incomesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an income' })
  @ApiOkResponse({ type: Income })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncomeDto,
  ): Promise<Income> {
    return this.incomesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an income' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.incomesService.remove(id);
  }
}
