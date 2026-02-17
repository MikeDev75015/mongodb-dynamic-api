[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Entities

## BaseEntity

The `BaseEntity` class provides a consistent interface for all entities.

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

- `_id` and `__v` are MongoDB/Mongoose internals, excluded from output.
- `id` is a string version of `_id`.
- `createdAt` and `updatedAt` are managed automatically.

## SoftDeletableEntity

The `SoftDeletableEntity` class adds soft-delete support to your entities.

```typescript
export abstract class SoftDeletableEntity extends BaseEntity {
  @Exclude()
  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @ApiProperty({ type: Date, nullable: true })
  @Prop({ type: Date, nullable: true })
  deletedAt: Date | null;
}
```

**Tip:** Extend these base classes for all your content entities to ensure consistency and code reuse.

___

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)**
| **[WebSockets](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/websockets.md)**


<br>
<br>
<br>