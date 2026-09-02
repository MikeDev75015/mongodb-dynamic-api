import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { ObjectId } from 'mongoose';

export abstract class BaseEntity {
  // `declare` (not just a bare type annotation) on every field below: under plain tsc these
  // uninitialized fields already emit no runtime code, but SWC (this repo's Vitest transform)
  // defines each one as an own `undefined` property in the constructor unless told not to via
  // `declare` - which then rode along through `plainToInstance()` on every write route (visible
  // as a real MongoDB "(immutable) field '_id' was found to have been altered" error on replace,
  // since the resulting instance had a real, enumerable `id: undefined` own property that a
  // subclass's/library's write path serialized into the Mongo command). `declare` restores the
  // type-only, no-runtime-emission behavior under both compilers.
  @Exclude()
  declare _id: ObjectId;

  @Exclude()
  declare __v: number;

  @ApiProperty()
  declare id: string;

  @ApiProperty()
  @Prop({ type: Date })
  declare createdAt: Date;

  @ApiProperty()
  @Prop({ type: Date })
  declare updatedAt: Date;
}
