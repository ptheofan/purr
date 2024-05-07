import { registerEnumType } from '@nestjs/graphql';

export enum GroupState {
  Initializing = 'Initializing',
  Ready = 'Ready',
}

registerEnumType(GroupState, {
  name: 'GroupState',
  description: 'The state of this group',
})
