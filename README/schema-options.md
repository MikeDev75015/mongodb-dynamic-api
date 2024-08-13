[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)
<br>**[Swagger UI](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/swagger-ui.md)**
| **[Versioning](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/versioning.md)**
| **[Validation](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/validation.md)**
| **[Caching](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/caching.md)**
| **[Authentication](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authentication.md)**
| **[Authorization](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/authorization.md)**
| **[WebSockets](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README/websockets.md)**

___

# Schema Options
`DynamicAPISchemaOptions(options: DynamicAPISchemaOptionsInterface): ClassDecorator`

In summary, to add indexes, hooks, or custom initialization to your Mongoose schema,
you must set it in the options passed to the DynamicAPISchemaOptions decorator
added to your entity class.

*The options object can include an **array of indexes**, an **array of hooks** and a **customInit function**.*

## Indexes

Each index is an object with fields and options.
<br>The fields is an object that defines the fields to index, and the options is an optional object that can include various index options such as unique, sparse, etc.
These options allow you to customize the behavior of the index.

For example, setting unique to true ensures that the indexed fields do not store duplicate values.
Setting sparse to true ensures that the index only includes documents that contain the indexed fields.

```typescript
@DynamicAPISchemaOptions({
  indexes: [
    { fields: { email: 1 }, options: { unique: true } }, // <- ensure that the email field is unique
  ],
})
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  email: string;
}
```

In summary, the available options for an index are determined by the IndexOptions interface from [Mongoose Indexes](https://mongoosejs.com/docs/guide.html#indexes).

## Hooks

Each hook is an object with a **type**, **method**, **callback**, and **options**.
- The **type** is a route type that represents the hook event, such as 'CreateMany', 'CreateOne', 'DeleteOne',
'GetMany', etc.
- The **method** is either 'pre' or 'post', indicating whether the hook should be executed before or after the
event.
- The **callback** is a function that will be executed when the hook is triggered.
- The **options** is an optional object that can include a document and query boolean.

For example, the following code adds a pre hook that will be executed before the 'CreateOne' event:

```typescript
@DynamicAPISchemaOptions({
  hooks: [
    {
      type: 'CreateOne',
      method: 'pre',
      callback: function (next) {
        console.log('Creating a new user document...');
        next();
      },
    },
  ],
})
@Schema({ collection: 'users' })
export class User extends BaseEntity { // <- extends BaseEntity
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  email: string;
}
```

In summary, the available options for a hook are determined by the Mongoose Schema API. See
[Schema.prototype.pre()](https://mongoosejs.com/docs/api/schema.html#Schema.prototype.pre())
or [Schema.prototype.post()](https://mongoosejs.com/docs/api/schema.html#Schema.prototype.post())
for more details.

## Custom Initialization

The customInit is a function that will be executed when the schema is initialized.
This function can be used to perform any custom initialization logic, such as adding your usual methods to the schema.

For example, the following code adds a customInit function that will be executed when the schema is initialized:

```typescript
@DynamicAPISchemaOptions({
  customInit: (schema) => {
    schema.virtual('fullName').get(function () {
      return this.name + ' ' + this.email;
    });
  },
})
@Schema({ collection: 'users' })
export class User extends BaseEntity { // <- extends BaseEntity
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  email: string;
}
```

In summary, the customInit function is a function that takes a schema as an argument and can be used to add any schema methods. See [Mongoose Schema API](https://mongoosejs.com/docs/api/schema.html) for more details.

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