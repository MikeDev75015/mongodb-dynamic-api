import { ApiProperty } from '@nestjs/swagger';

/** @deprecated Internal API — will be removed from public exports in v5. */
export class DeletePresenter {
  @ApiProperty()
  deletedCount: number;
}
