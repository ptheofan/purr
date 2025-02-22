import { Query, Resolver } from '@nestjs/graphql';
import { AppConfigModel } from '../models'
import { ApiService } from '../services'

@Resolver(() => AppConfigModel)
export class AppConfigResolver {
  constructor(
    private readonly apiService: ApiService,
  ) {
  }

  @Query(() => AppConfigModel)
  async appConfig(): Promise<AppConfigModel> {
    return this.apiService.getAppConfig();
  }
}
