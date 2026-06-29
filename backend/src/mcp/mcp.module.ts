import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { ProjectsModule } from '../projects/projects.module';
import { FinancesModule } from '../finances/finances.module';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

@Module({
  imports: [ProjectsModule, ActivitiesModule, FinancesModule],
  providers: [McpService],
  controllers: [McpController],
})
export class McpModule {}
