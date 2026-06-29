import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { PurchasePriority } from '../../common/enums/purchase-priority.enum';
import { PurchaseStore } from '../../common/enums/purchase-store.enum';
import { PurchaseStatus } from '../../common/enums/purchase-status.enum';

export class CreatePurchaseDto {
  @ApiProperty({ example: 'Teclado mecánico', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @ApiPropertyOptional({ example: 250000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  estimatedPrice?: number;

  @ApiPropertyOptional({ enum: PurchasePriority, default: PurchasePriority.MEDIA })
  @IsEnum(PurchasePriority)
  @IsOptional()
  priority?: PurchasePriority;

  @ApiPropertyOptional({ enum: PurchaseStore, default: PurchaseStore.OTRA })
  @IsEnum(PurchaseStore)
  @IsOptional()
  store?: PurchaseStore;

  @ApiPropertyOptional({ enum: PurchaseStatus, default: PurchaseStatus.PENDIENTE })
  @IsEnum(PurchaseStatus)
  @IsOptional()
  status?: PurchaseStatus;

  @ApiPropertyOptional({ example: 'https://www.amazon.com/product' })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ example: 'Esperando descuento del 20%' })
  @IsString()
  @IsOptional()
  notes?: string;
}
