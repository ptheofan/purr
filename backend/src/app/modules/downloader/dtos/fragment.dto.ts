export enum FragmentStatus {
  pending = 'pending', // Work not started (not downloaded)
  finished = 'finished', // Work completed (downloaded)
  reserved = 'reserved', // Work in progress (do not touch)
}

// Simple DTO class for GraphQL compatibility but without decorators to avoid compilation issues
export class FragmentDto {
  start: number;
  end: number;
  status: FragmentStatus;
}
