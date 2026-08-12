import { ApiProperty } from '@nestjs/swagger';

/** @internal Not part of the public API — will be removed from the package's public exports in v5. */
export class DeletePresenter {
  @ApiProperty()
  deletedCount: number;
}
