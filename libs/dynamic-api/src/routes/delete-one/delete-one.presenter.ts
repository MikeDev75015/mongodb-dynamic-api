import { ApiProperty } from '@nestjs/swagger';

export class DeleteOnePresenter {
  @ApiProperty()
  deletedCount: number;
}
