import { Controller, NotFoundException, Post } from '@nestjs/common';
import { AppConfigService } from '../../configuration';

@Controller({ path: 'webhooks/putio' })
export class WebhooksController {
  constructor(
    private readonly config: AppConfigService,
  ) {}

  @Post()
  async putioWebhook(): Promise<void> {
    if (!this.config.putioWebhooksEnabled) {
      throw new NotFoundException('Put.io webhooks are not enabled');
    }


  }
}
