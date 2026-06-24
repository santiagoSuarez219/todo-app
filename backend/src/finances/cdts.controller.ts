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
import { CdtsService } from './cdts.service';
import { CreateCdtDto } from './dto/create-cdt.dto';
import { UpdateCdtDto } from './dto/update-cdt.dto';
import { Cdt } from './entities/cdt.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('finances / cdts')
@Controller('finances/cdts')
export class CdtsController {
  constructor(private readonly cdtsService: CdtsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new CDT' })
  @ApiCreatedResponse({ type: Cdt })
  create(@Body() dto: CreateCdtDto): Promise<Cdt> {
    return this.cdtsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all CDTs (paginated, ordered by endDate ASC)' })
  @ApiOkResponse({ type: [Cdt] })
  findAll(@Query() pagination: PaginationDto): Promise<Cdt[]> {
    return this.cdtsService.findAll(pagination);
  }

  @Get('active')
  @ApiOperation({ summary: 'List active CDTs (endDate >= today)' })
  @ApiOkResponse({ type: [Cdt] })
  findActive(): Promise<Cdt[]> {
    return this.cdtsService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single CDT by ID' })
  @ApiOkResponse({ type: Cdt })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Cdt> {
    return this.cdtsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a CDT' })
  @ApiOkResponse({ type: Cdt })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCdtDto,
  ): Promise<Cdt> {
    return this.cdtsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a CDT' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.cdtsService.remove(id);
  }
}
