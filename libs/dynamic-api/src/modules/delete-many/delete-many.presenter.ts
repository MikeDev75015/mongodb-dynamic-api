import { ApiProperty } from '@nestjs/swagger';

export class DeleteManyPresenter {
  @ApiProperty()
  deletedCount: number;
}
