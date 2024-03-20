[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)**

___

## BaseEntity

The BaseEntity class includes properties to ensure that all entities have a consistent interface.

```typescript
export abstract class BaseEntity {
  @Exclude()
  _id: ObjectId;

  @Exclude()
  __v: number;

  @ApiProperty()
  id: string;

  @ApiProperty()
  @Prop({ type: Date })
  createdAt: Date;

  @ApiProperty()
  @Prop({ type: Date })
  updatedAt: Date;
}
```

- The `_id` and `__v` properties are specific to MongoDB and Mongoose.
The `_id` property is the unique identifier automatically created by MongoDB for each document,
and the `__v` property is the version key used by Mongoose for optimistic concurrency control.
Both of these properties are decorated with the `@Exclude` decorator from the `class-transformer` package,
which excludes these properties when transforming the object to a plain JavaScript object or JSON.
- The `id` property is a string representation of the `_id` property.
- The `createdAt` and `updatedAt` properties are dates that indicate when the entity was created and last updated.
These properties are decorated with the `@ApiProperty` decorator from the `@nestjs/swagger` package,
which is used to define metadata for Swagger documentation.
There are also decorated with the `@Prop` decorator from the `@nestjs/mongoose`
package, which is used to define a property in a Mongoose schema.

*By extending the `BaseEntity` class, your content entity class inherits these common properties.
This promotes code reuse and consistency across different entities.*


## SoftDeletableEntity

The SoftDeletableEntity class is designed to provide additional properties and behavior to entities that need
to support soft deletion.

```typescript
export abstract class SoftDeletableEntity extends BaseEntity {
  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
```

The SoftDeletableEntity class includes two properties related to soft deletion: `isDeleted` and `deletedAt`,
and also the `BaseEntity` properties.

Soft deletion is a strategy used in applications where data should not be permanently removed from the
database when a delete operation is performed.
<br>Instead, a flag is set on the record indicating that it is deleted, and this flag is then used to exclude
the record from queries.

*By extending the `SoftDeletableEntity` class,
your content entity class inherits these properties (along with those of `BaseEntity`).
This allows the entity to be soft deleted,
with the deletion status and time of deletion tracked by the `isDeleted` and `deletedAt` properties.*

___

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)**


<br>
<br>
<br>