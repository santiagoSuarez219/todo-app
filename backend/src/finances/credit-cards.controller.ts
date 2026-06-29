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
import { CreditCardsService } from './credit-cards.service';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { CreditCard } from './entities/credit-card.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('finances / credit-cards')
@Controller('finances/credit-cards')
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new credit card' })
  @ApiCreatedResponse({ type: CreditCard })
  create(@Body() dto: CreateCreditCardDto): Promise<CreditCard> {
    return this.creditCardsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List credit cards (paginated)' })
  @ApiOkResponse({ type: [CreditCard] })
  findAll(@Query() pagination: PaginationDto): Promise<CreditCard[]> {
    return this.creditCardsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single credit card by ID' })
  @ApiOkResponse({ type: CreditCard })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CreditCard> {
    return this.creditCardsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a credit card' })
  @ApiOkResponse({ type: CreditCard })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCreditCardDto,
  ): Promise<CreditCard> {
    return this.creditCardsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a credit card' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.creditCardsService.remove(id);
  }
}
