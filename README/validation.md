[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

---

# Validation

Enable global validation for all API endpoints using NestJS's built-in validation pipe and class-validator decorators. Ensure data integrity and provide meaningful error messages.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Configuration Levels](#configuration-levels)
- [Validation Decorators](#validation-decorators)
- [Custom Validation](#custom-validation)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Quick Start

### Enable Global Validation

Add validation globally in your `main.ts`:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { enableDynamicAPIValidation } from 'mongodb-dynamic-api';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable global validation
  enableDynamicAPIValidation(app);
  
  await app.listen(3000);
}
bootstrap();
```

### Add Validation to Entities

Use class-validator decorators:

```typescript
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from 'mongodb-dynamic-api';
import { IsEmail, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  @Prop({ type: String, required: true, unique: true })
  email: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @Prop({ type: String })
  phone?: string;
}
```

**🎉 Done!** Validation is now active for all endpoints.

---

## Configuration Levels

### Global Configuration

Apply validation to all routes:

```typescript
enableDynamicAPIValidation(app, {
  whitelist: true,              // Strip unknown properties
  forbidNonWhitelisted: true,   // Throw error on unknown properties
  transform: true,              // Auto-transform payloads to DTO instances
  disableErrorMessages: false,  // Show detailed validation errors
});
```

### Controller-Level Configuration

Override global settings for specific controllers:

```typescript
DynamicApiModule.forFeature({
  entity: User,
  controllerOptions: {
    path: 'users',
    validationPipeOptions: {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    },
  },
})
```

### Route-Level Configuration

Fine-tune validation for individual routes:

```typescript
DynamicApiModule.forFeature({
  entity: Product,
  controllerOptions: {
    path: 'products',
  },
  routes: [
    {
      type: 'CreateOne',
      validationPipeOptions: {
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      },
    },
    {
      type: 'UpdateOne',
      validationPipeOptions: {
        whitelist: true,
        skipMissingProperties: true, // Allow partial updates
      },
    },
  ],
})
```

---

## Validation Decorators

### String Validation

```typescript
import { IsString, IsNotEmpty, MinLength, MaxLength, Matches, IsEmail, IsUrl } from 'class-validator';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Prop({ type: String, required: true })
  firstName: string;

  @IsEmail()
  @Prop({ type: String, required: true })
  email: string;

  @IsUrl()
  @IsOptional()
  @Prop({ type: String })
  website?: string;

  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  @IsOptional()
  @Prop({ type: String })
  phone?: string;
}
```

### Number Validation

```typescript
import { IsNumber, Min, Max, IsInt, IsPositive, IsNegative } from 'class-validator';

@Schema({ collection: 'products' })
export class Product extends BaseEntity {
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Max(1000000)
  @Prop({ type: Number, required: true })
  price: number;

  @IsInt()
  @Min(0)
  @Prop({ type: Number, default: 0 })
  stock: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Prop({ type: Number })
  discountPercent?: number;
}
```

### Boolean Validation

```typescript
import { IsBoolean } from 'class-validator';

@Schema({ collection: 'products' })
export class Product extends BaseEntity {
  @IsBoolean()
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @IsBoolean()
  @IsOptional()
  @Prop({ type: Boolean })
  isFeatured?: boolean;
}
```

### Date Validation

```typescript
import { IsDate, MinDate, MaxDate } from 'class-validator';
import { Type } from 'class-transformer';

@Schema({ collection: 'events' })
export class Event extends BaseEntity {
  @IsDate()
  @Type(() => Date)
  @MinDate(new Date())
  @Prop({ type: Date, required: true })
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  @Prop({ type: Date, required: true })
  endDate: Date;
}
```

### Array Validation

```typescript
import { IsArray, ArrayMinSize, ArrayMaxSize, IsString, IsIn } from 'class-validator';

@Schema({ collection: 'posts' })
export class Post extends BaseEntity {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Prop({ type: [String] })
  tags: string[];

  @IsArray()
  @IsIn(['draft', 'published', 'archived'], { each: true })
  @Prop({ type: [String] })
  statuses: string[];
}
```

### Enum Validation

```typescript
import { IsEnum } from 'class-validator';

enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @IsEnum(UserRole)
  @Prop({ type: String, enum: Object.values(UserRole), default: UserRole.USER })
  role: UserRole;
}
```

### Nested Object Validation

```typescript
import { ValidateNested, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class Address {
  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  country: string;

  @IsString()
  zipCode: string;
}

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @ValidateNested()
  @Type(() => Address)
  @Prop({ type: Address })
  address: Address;
}
```

---

## Custom Validation

### Custom Validator

```typescript
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          const hasUpperCase = /[A-Z]/.test(value);
          const hasLowerCase = /[a-z]/.test(value);
          const hasNumber = /\d/.test(value);
          const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
          const isLongEnough = value.length >= 8;
          
          return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && isLongEnough;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character';
        },
      },
    });
  };
}

// Usage
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @IsStrongPassword()
  @Prop({ type: String, required: true })
  password: string;
}
```

### Custom Validation Class

```typescript
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isUniqueEmail', async: true })
export class IsUniqueEmailConstraint implements ValidatorConstraintInterface {
  async validate(email: string, args: ValidationArguments) {
    // Check if email exists in database
    // Return false if exists, true if unique
    // const user = await userRepository.findOne({ email });
    // return !user;
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Email already exists';
  }
}

// Usage
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @Validate(IsUniqueEmailConstraint)
  @IsEmail()
  @Prop({ type: String, required: true })
  email: string;
}
```

---

## Best Practices

### 1. Use Appropriate Validators

```typescript
// ✅ Good - Specific validators
@IsEmail()
@Prop({ type: String })
email: string;

@IsUrl()
@Prop({ type: String })
website: string;

@IsPhoneNumber('US')
@Prop({ type: String })
phone: string;

// ❌ Avoid - Generic validators
@IsString()
@Prop({ type: String })
email: string;
```

### 2. Provide Clear Error Messages

```typescript
// ✅ Good - Clear, actionable messages
@MinLength(8, { message: 'Password must be at least 8 characters long' })
@Matches(/^(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter' })
@Prop({ type: String })
password: string;

// ❌ Avoid - Generic messages
@MinLength(8)
@Prop({ type: String })
password: string;
```

### 3. Use Transform Decorators

```typescript
import { Transform } from 'class-transformer';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  // Trim whitespace
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty()
  @Prop({ type: String })
  name: string;

  // Convert to lowercase
  @Transform(({ value }) => value?.toLowerCase())
  @IsEmail()
  @Prop({ type: String })
  email: string;
}
```

### 4. Conditional Validation

```typescript
import { ValidateIf } from 'class-validator';

@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @IsBoolean()
  @Prop({ type: Boolean })
  hasCompany: boolean;

  // Only validate if hasCompany is true
  @ValidateIf(o => o.hasCompany === true)
  @IsNotEmpty()
  @Prop({ type: String })
  companyName?: string;
}
```

### 5. Validation Groups

```typescript
@Schema({ collection: 'users' })
export class User extends BaseEntity {
  @IsNotEmpty({ groups: ['create'] })
  @IsOptional({ groups: ['update'] })
  @Prop({ type: String })
  password: string;
}

// In route configuration
DynamicApiModule.forFeature({
  entity: User,
  routes: [
    {
      type: 'CreateOne',
      validationPipeOptions: {
        groups: ['create'],
      },
    },
    {
      type: 'UpdateOne',
      validationPipeOptions: {
        groups: ['update'],
      },
    },
  ],
})
```

---

## Examples

### Complete Validation Example

```typescript
// src/products/product.entity.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { BaseEntity } from 'mongodb-dynamic-api';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsNotEmpty, 
  IsString, 
  IsNumber, 
  IsBoolean, 
  IsArray, 
  IsEnum,
  IsOptional,
  Min, 
  Max, 
  MinLength, 
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Transform } from 'class-transformer';

enum ProductCategory {
  ELECTRONICS = 'electronics',
  CLOTHING = 'clothing',
  BOOKS = 'books',
  HOME = 'home',
  SPORTS = 'sports',
}

@Schema({ collection: 'products' })
export class Product extends BaseEntity {
  @ApiProperty({ 
    description: 'Product name',
    example: 'Laptop Dell XPS 15',
    minLength: 3,
    maxLength: 200,
  })
  @IsNotEmpty({ message: 'Product name is required' })
  @IsString({ message: 'Product name must be a string' })
  @MinLength(3, { message: 'Product name must be at least 3 characters' })
  @MaxLength(200, { message: 'Product name cannot exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  @Prop({ type: String, required: true })
  name: string;

  @ApiPropertyOptional({ 
    description: 'Product description',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  @Transform(({ value }) => value?.trim())
  @Prop({ type: String })
  description?: string;

  @ApiProperty({ 
    description: 'Product price in USD',
    example: 1299.99,
    minimum: 0.01,
    maximum: 1000000,
  })
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0.01, { message: 'Price must be at least 0.01' })
  @Max(1000000, { message: 'Price cannot exceed 1,000,000' })
  @Prop({ type: Number, required: true })
  price: number;

  @ApiProperty({ 
    description: 'Product category',
    enum: ProductCategory,
    example: ProductCategory.ELECTRONICS,
  })
  @IsEnum(ProductCategory, { message: 'Invalid category' })
  @Prop({ type: String, enum: Object.values(ProductCategory), required: true })
  category: ProductCategory;

  @ApiProperty({ 
    description: 'Stock quantity',
    example: 50,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Stock must be a number' })
  @Min(0, { message: 'Stock cannot be negative' })
  @Prop({ type: Number, default: 0 })
  stock: number;

  @ApiProperty({ 
    description: 'Product availability',
    example: true,
  })
  @IsBoolean({ message: 'isAvailable must be a boolean' })
  @Prop({ type: Boolean, default: true })
  isAvailable: boolean;

  @ApiPropertyOptional({ 
    description: 'Product tags',
    type: [String],
    example: ['laptop', 'dell', 'xps'],
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @ArrayMinSize(1, { message: 'At least one tag is required' })
  @ArrayMaxSize(10, { message: 'Maximum 10 tags allowed' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @Transform(({ value }) => value?.map((tag: string) => tag.toLowerCase().trim()))
  @Prop({ type: [String] })
  tags?: string[];
}

// src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation
  enableDynamicAPIValidation(app, {
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  });

  await app.listen(3000);
}
bootstrap();
```

### Error Response Example

When validation fails:

```json
{
  "statusCode": 400,
  "message": [
    "Product name is required",
    "Price must be a number",
    "Price must be at least 0.01",
    "Invalid category"
  ],
  "error": "Bad Request"
}
```

---

## Related Documentation

- 🏗️ **[Entities](./entities.md)** - Define entity structure
- 📚 **[Swagger UI](./swagger-ui.md)** - Validation in documentation
- 🔐 **[Authentication](./authentication.md)** - Validate auth data

---

## Additional Resources

- [Class Validator Documentation](https://github.com/typestack/class-validator)
- [Class Transformer Documentation](https://github.com/typestack/class-transformer)
- [NestJS Validation Documentation](https://docs.nestjs.com/techniques/validation)

---

[Back to README](https://github.com/MikeDev75015/mongodb-dynamic-api/blob/develop/README.md)

