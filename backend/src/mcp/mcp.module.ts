import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { ProjectsModule } from '../projects/projects.module';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

@Module({
  imports: [ProjectsModule, ActivitiesModule],
  providers: [McpService],
  controllers: [McpController],
})
export class McpModule {}
