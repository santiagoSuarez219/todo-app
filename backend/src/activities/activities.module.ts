import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { Activity } from './entities/activity.entity';
import { ProjectsModule } from '../projects/projects.module';
import { RecurrenceSchedulerService } from './recurrence-scheduler.service';

@Module({
  imports: [TypeOrmModule.forFeature([Activity]), ProjectsModule],
  providers: [ActivitiesService, RecurrenceSchedulerService],
  controllers: [ActivitiesController],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
