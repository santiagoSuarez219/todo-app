import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ActivitiesService } from './activities.service';

@Injectable()
export class RecurrenceSchedulerService {
  private readonly logger = new Logger(RecurrenceSchedulerService.name);

  constructor(private readonly activitiesService: ActivitiesService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateNextDayInstances(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    this.logger.log(`Generating instances for ${tomorrow.toISOString().split('T')[0]}`);

    const templates = await this.activitiesService.findActiveTemplates();
    let generated = 0;

    for (const template of templates) {
      if (this.activitiesService.shouldGenerateForDate(template, tomorrow)) {
        const instance = await this.activitiesService.generateInstanceForDate(
          template,
          tomorrow,
        );
        if (instance) generated++;
      }
    }

    this.logger.log(
      `Processed ${templates.length} templates, generated ${generated} instances`,
    );
  }
}
