
export class CreateUploadDto {
  // Target folder ID
  targetId: number;

  // File to upload (full path with filename)
  file: string;

  // Optional change the upload filename
  uploadAs?: string;
}
