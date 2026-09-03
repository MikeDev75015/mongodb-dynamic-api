import { ApiProperty } from '@nestjs/swagger';

/** @internal Not part of the public API. */
export class DeletePresenter {
  @ApiProperty()
  deletedCount: number;
}
