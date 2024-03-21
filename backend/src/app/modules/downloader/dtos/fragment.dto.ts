export enum FragmentStatus {
  pending = 'pending', // Work not started (not downloaded)
  finished = 'finished', // Work completed (downloaded)
  reserved = 'reserved', // Work in progress (do not touch)
}

export class FragmentDto {
  start: number;
  end: number;
  status: FragmentStatus;
}
