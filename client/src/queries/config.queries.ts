import { gql } from '../__generated__';
import { AppConfigBasicFragment, AppConfigAdvancedFragment, AppConfigPutioFragment, AppConfigTargetsFragment } from '../fragments';

// Complete app config query using all fragments
export const GET_APP_CONFIG = gql(`
  query GetAppConfig {
    appConfig {
      ...AppConfigBasic
      ...AppConfigAdvanced
      ...AppConfigPutio
      ...AppConfigTargets
    }
  }
`);

// Minimal config query for basic settings
export const GET_APP_CONFIG_BASIC = gql(`
  query GetAppConfigBasic {
    appConfig {
      ...AppConfigBasic
    }
  }
`);
