import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PurchaseStatus } from '../../common/enums/purchase-status.enum';

export class PurchasesQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PurchaseStatus })
  @IsEnum(PurchaseStatus)
  @IsOptional()
  status?: PurchaseStatus;
}
