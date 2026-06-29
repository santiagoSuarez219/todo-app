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
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchasesQueryDto } from './dto/purchases-query.dto';
import { Purchase } from './entities/purchase.entity';

@ApiTags('finances / purchases')
@Controller('finances/purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new purchase (wishlist item)' })
  @ApiCreatedResponse({ type: Purchase })
  create(@Body() dto: CreatePurchaseDto): Promise<Purchase> {
    return this.purchasesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List purchases, optionally filtered by status' })
  @ApiOkResponse({ type: [Purchase] })
  findAll(@Query() query: PurchasesQueryDto): Promise<Purchase[]> {
    const { status, ...pagination } = query;
    return this.purchasesService.findAll(pagination, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single purchase by ID' })
  @ApiOkResponse({ type: Purchase })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Purchase> {
    return this.purchasesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a purchase' })
  @ApiOkResponse({ type: Purchase })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseDto,
  ): Promise<Purchase> {
    return this.purchasesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a purchase' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.purchasesService.remove(id);
  }
}
