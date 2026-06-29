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
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account } from './entities/account.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('finances / accounts')
@Controller('finances/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  @ApiCreatedResponse({ type: Account })
  create(@Body() dto: CreateAccountDto): Promise<Account> {
    return this.accountsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List accounts (paginated)' })
  @ApiOkResponse({ type: [Account] })
  findAll(@Query() pagination: PaginationDto): Promise<Account[]> {
    return this.accountsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single account by ID' })
  @ApiOkResponse({ type: Account })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Account> {
    return this.accountsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an account' })
  @ApiOkResponse({ type: Account })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<Account> {
    return this.accountsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an account' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.accountsService.remove(id);
  }
}
