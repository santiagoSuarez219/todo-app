import { PartialType } from '@nestjs/swagger';
import { CreateCdtDto } from './create-cdt.dto';

export class UpdateCdtDto extends PartialType(CreateCdtDto) {}
