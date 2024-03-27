import { ApiProperty } from '@nestjs/swagger';

export class DeletePresenter {
  @ApiProperty()
  deletedCount: number;
}
