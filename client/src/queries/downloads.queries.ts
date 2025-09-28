import { gql } from '../__generated__';
import { GroupWithItemsFragment, GroupBasicInfoFragment, ItemWithDetailsFragment } from '../fragments';

// Get all groups with their items
export const GET_GROUPS = gql(`
  query GetGroups {
    getGroups {
      ...GroupBasicInfo
      ...GroupWithItems
    }
  }
`);

// Get a specific group by ID
export const GET_GROUP = gql(`
  query GetGroup($id: Int!) {
    getGroup(id: $id) {
      ...GroupBasicInfo
      ...GroupWithItems
    }
  }
`);

// Get all items
export const GET_ITEMS = gql(`
  query GetItems {
    getItems {
      ...ItemWithDetails
    }
  }
`);

// Get a specific item by ID
export const GET_ITEM = gql(`
  query GetItem($id: Int!) {
    getItem(id: $id) {
      ...ItemWithDetails
    }
  }
`);
