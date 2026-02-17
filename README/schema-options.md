[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Schema Options

Use `@DynamicAPISchemaOptions(options)` to add indexes, hooks, or custom initialization to your Mongoose schema.

## Indexes

Define indexes to optimize queries and enforce constraints.

```typescript
@DynamicAPISchemaOptions({
  indexes: [
    { fields: { email: 1 }, options: { unique: true } },
  ],
})
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;
}
```

- Use the [Mongoose IndexOptions](https://mongoosejs.com/docs/guide.html#indexes) for available options.

## Hooks

Add pre/post hooks for lifecycle events (e.g., CreateOne, DeleteOne).

```typescript
@DynamicAPISchemaOptions({
  hooks: [
    { type: 'CreateOne', method: 'pre', callback: () => {/* ... */} },
  ],
})
```

**Tip:** Use hooks for validation, logging, or side effects.

## Custom Initialization

Use `customInit` for schema initialization logic.

```typescript
@DynamicAPISchemaOptions({
  customInit: (schema) => {
    schema.virtual('fullName').get(function () {
      return this.name + ' ' + this.email;
    });
  },
})
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;
}
```

- See [Mongoose Schema API](https://mongoosejs.com/docs/api/schema.html) for details on adding methods and other customizations.

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