import { Controller, Logger, NotFoundException, OnModuleInit, Post } from '@nestjs/common';
import { AppConfigService } from '../../configuration';
import { createUrl } from '../../../helpers';

@Controller({ path: 'webhooks/putio' })
export class WebhooksController implements OnModuleInit {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly config: AppConfigService,
  ) {}

  async onModuleInit() {
    // Init put.io Webhooks
    if (this.config.putioWebhooksEnabled) {
      const webhookUrl = createUrl({
        host: this.config.host,
        port: this.config.port,
        path: 'putio/webhook',
      });
      this.logger.log(
        `put.io webhooks are enabled, your webhook URL is: ${ webhookUrl }`,
      );
    }
  }

  @Post()
  async putioWebhook(): Promise<void> {
    if (!this.config.putioWebhooksEnabled) {
      throw new NotFoundException('Put.io webhooks are not enabled');
    }


  }
}
