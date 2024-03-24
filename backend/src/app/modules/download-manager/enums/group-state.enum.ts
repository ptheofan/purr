import { registerEnumType } from '@nestjs/graphql';

export enum GroupState {
  Initializing = 'INITIALIZING',
  Ready = 'READY',
}

registerEnumType(GroupState, {
  name: 'GroupState',
  description: 'The state of this group',
})
