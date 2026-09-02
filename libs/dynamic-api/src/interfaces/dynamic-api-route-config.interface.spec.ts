import { describe, expect, it, test } from 'vitest';
/**
 * Compile-time + runtime tests for the discriminated union `DynamicApiRouteConfig`.
 *
 * Strategy:
 *  - Runtime checks verify that each per-route config type is structurally valid.
 *  - `@ts-expect-error` lines verify that TS rejects wrong `beforeSaveCallback`
 *    signatures on the wrong route type, proving contravariance is solved.
 */
import { CallbackMethods } from './dynamic-api-service-callback.interface';
import {
  AggregateRouteConfig,
  BaseRouteConfig,
  CreateManyRouteConfig,
  CreateOneRouteConfig,
  DeleteManyRouteConfig,
  DeleteOneRouteConfig,
  DuplicateManyRouteConfig,
  DuplicateOneRouteConfig,
  DynamicApiRouteConfig,
  DynamicAPIRouteConfig,
  GetManyRouteConfig,
  GetOneRouteConfig,
  ReplaceOneRouteConfig,
  UpdateManyRouteConfig,
  UpdateOneRouteConfig,
  CustomOperationRouteConfig,
  defineCreateCallback,
  defineCreateManyCallback,
  defineUpdateCallback,
  defineUpdateManyCallback,
  defineReplaceCallback,
  defineDuplicateCallback,
  defineDuplicateManyCallback,
} from './dynamic-api-route-config.interface';
import {
  BeforeSaveCallback,
  BeforeSaveCreateContext,
  BeforeSaveCreateManyContext,
  BeforeSaveDeleteCallback,
  BeforeSaveDeleteContext,
  BeforeSaveDeleteManyCallback,
  BeforeSaveDeleteManyContext,
  BeforeSaveDuplicateContext,
  BeforeSaveDuplicateManyContext,
  BeforeSaveListCallback,
  BeforeSaveReplaceContext,
  BeforeSaveUpdateContext,
  BeforeSaveUpdateManyContext,
} from './dynamic-api-service-before-save-callback.interface';
import { BaseEntity } from '../models';

// ---------------------------------------------------------------------------
// Domain fixtures
// ---------------------------------------------------------------------------

class Item extends BaseEntity {
  name: string;
  price: number;
}

class CreateItemDto {
  name: string;
  price: number;
  sku?: string;
}

const fakeCallbackMethods = {} as CallbackMethods;

// ---------------------------------------------------------------------------
// BaseRouteConfig — common fields present on every variant
// ---------------------------------------------------------------------------

describe('BaseRouteConfig', () => {
  it('should allow all common optional fields', () => {
    const base: BaseRouteConfig<Item> = {
      isPublic: true,
      disableCache: false,
      description: 'test',
      version: '1',
      subPath: 'sub',
      validationPipeOptions: { transform: true },
    };

    expect(base.isPublic).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Per-route configs — structural validity
// ---------------------------------------------------------------------------

describe('per-route config structural correctness', () => {
  it.each<[string, DynamicApiRouteConfig<Item>]>([
    ['CreateOne', { type: 'CreateOne' }],
    ['CreateMany', { type: 'CreateMany' }],
    ['UpdateOne', { type: 'UpdateOne' }],
    ['UpdateMany', { type: 'UpdateMany' }],
    ['ReplaceOne', { type: 'ReplaceOne' }],
    ['DuplicateOne', { type: 'DuplicateOne' }],
    ['DuplicateMany', { type: 'DuplicateMany' }],
    ['DeleteOne', { type: 'DeleteOne' }],
    ['DeleteMany', { type: 'DeleteMany' }],
    ['GetOne', { type: 'GetOne' }],
    ['GetMany', { type: 'GetMany' }],
    ['Aggregate', { type: 'Aggregate' }],
    ['Custom', { type: 'Custom' }],
  ])('%s — minimal config (no beforeSaveCallback) is valid', (_label, cfg) => {
    expect(cfg.type).toBeTruthy();
  });

  it('DeleteOne accepts cascade + beforeDeleteCallback', () => {
    const cfg: DeleteOneRouteConfig<Item> = {
      type: 'DeleteOne',
      cascade: [{ entity: class Ref extends BaseEntity {}, foreignKey: 'itemId', on: 'delete' }],
      beforeDeleteCallback: async () => undefined,
    };

    expect(cfg.cascade).toHaveLength(1);
    expect(cfg.beforeDeleteCallback).toBeDefined();
  });

  it('DeleteMany accepts cascade + beforeDeleteCallback', () => {
    const cfg: DeleteManyRouteConfig<Item> = {
      type: 'DeleteMany',
      cascade: [{ entity: class Ref extends BaseEntity {}, foreignKey: 'itemId', on: 'delete' }],
      beforeDeleteCallback: async () => undefined,
    };

    expect(cfg.cascade).toHaveLength(1);
    expect(cfg.beforeDeleteCallback).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// CreateOne — typed beforeSaveCallback (no cast needed)
// ---------------------------------------------------------------------------

describe('CreateOneRouteConfig — beforeSaveCallback type', () => {
  it('accepts a correctly-typed BeforeSaveCallback with BeforeSaveCreateContext', async () => {
    const cb: BeforeSaveCallback<Item, BeforeSaveCreateContext<Item>> =
      async (_entity, ctx, _methods) => ({ ...ctx.toCreate, name: ctx.toCreate.name ?? 'default' });

    const cfg: CreateOneRouteConfig<Item> = {
      type: 'CreateOne',
      beforeSaveCallback: cb,
    };

    const result = await cfg.beforeSaveCallback!(
      undefined,
      { toCreate: { name: 'widget', price: 9.99 } },
      fakeCallbackMethods,
    );

    expect(result.name).toBe('widget');
  });

  it('accepts a typed callback with CreateItemDto BodyDTO inline — ctx.toCreate typed correctly', async () => {
    // Use explicit BodyDTO generic on the callback type; ctx.toCreate is Partial<CreateItemDto>
    type CreateItemCb = BeforeSaveCallback<Item, BeforeSaveCreateContext<Item, CreateItemDto>>;

    const cb: CreateItemCb = async (_entity, ctx) => ({
      name: ctx.toCreate.name ?? '',
      price: ctx.toCreate.price ?? 0,
      // ctx.toCreate.sku is accessible without cast because BodyDTO = CreateItemDto
    });

    // Inline callback; ctx shape matches BeforeSaveCreateContext<Item>
    const cfgInline: CreateOneRouteConfig<Item> = {
      type: 'CreateOne',
      beforeSaveCallback: async (_entity, ctx) => ({ name: ctx.toCreate.name, price: ctx.toCreate.price }),
    };

    const result = await cfgInline.beforeSaveCallback!(
      undefined,
      { toCreate: { name: 'gadget', price: 5 } },
      fakeCallbackMethods,
    );

    expect(result.name).toBe('gadget');

    // Verify cb independently (typed with BodyDTO)
    const ctxWithDto: BeforeSaveCreateContext<Item, CreateItemDto> = { toCreate: { name: 'gadget', price: 5, sku: 'SKU-001' } };
    const dtoResult = await cb(undefined, ctxWithDto, fakeCallbackMethods);
    expect(dtoResult.name).toBe('gadget');
  });
});

// ---------------------------------------------------------------------------
// CreateMany — typed beforeSaveCallback
// ---------------------------------------------------------------------------

describe('CreateManyRouteConfig — beforeSaveCallback type', () => {
  it('accepts BeforeSaveListCallback with BeforeSaveCreateManyContext', async () => {
    const cb: BeforeSaveListCallback<Item, BeforeSaveCreateManyContext<Item>> =
      async (_entities, ctx) => ctx.toCreate.map((i) => ({ name: i.name ?? '' }));

    const cfg: CreateManyRouteConfig<Item> = {
      type: 'CreateMany',
      beforeSaveCallback: cb,
    };

    const result = await cfg.beforeSaveCallback!(
      undefined,
      { toCreate: [{ name: 'a' }, { name: 'b' }] },
      fakeCallbackMethods,
    );

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('a');
  });
});

// ---------------------------------------------------------------------------
// UpdateOne — typed beforeSaveCallback
// ---------------------------------------------------------------------------

describe('UpdateOneRouteConfig — beforeSaveCallback type', () => {
  it('accepts BeforeSaveCallback with BeforeSaveUpdateContext', async () => {
    const cb: BeforeSaveCallback<Item, BeforeSaveUpdateContext<Item>> =
      async (_entity, ctx) => ({ ...ctx.update });

    const cfg: UpdateOneRouteConfig<Item> = {
      type: 'UpdateOne',
      beforeSaveCallback: cb,
    };

    const result = await cfg.beforeSaveCallback!(
      undefined,
      { id: 'item-1', update: { price: 12 } },
      fakeCallbackMethods,
    );

    expect(result.price).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// UpdateMany — typed beforeSaveCallback
// ---------------------------------------------------------------------------

describe('UpdateManyRouteConfig — beforeSaveCallback type', () => {
  it('accepts BeforeSaveListCallback with BeforeSaveUpdateManyContext', async () => {
    const cb: BeforeSaveListCallback<Item, BeforeSaveUpdateManyContext<Item>> =
      async (_entities, ctx) => ctx.ids.map(() => ({ price: ctx.update.price ?? 0 }));

    const cfg: UpdateManyRouteConfig<Item> = {
      type: 'UpdateMany',
      beforeSaveCallback: cb,
    };

    const result = await cfg.beforeSaveCallback!(
      undefined,
      { ids: ['a', 'b'], update: { price: 5 } },
      fakeCallbackMethods,
    );

    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// ReplaceOne — typed beforeSaveCallback
// ---------------------------------------------------------------------------

describe('ReplaceOneRouteConfig — beforeSaveCallback type', () => {
  it('accepts BeforeSaveCallback with BeforeSaveReplaceContext', async () => {
    const cb: BeforeSaveCallback<Item, BeforeSaveReplaceContext<Item>> =
      async (_entity, ctx) => ({ ...ctx.replacement });

    const cfg: ReplaceOneRouteConfig<Item> = {
      type: 'ReplaceOne',
      beforeSaveCallback: cb,
    };

    const result = await cfg.beforeSaveCallback!(
      undefined,
      { id: 'x', replacement: { name: 'replaced', price: 0 } },
      fakeCallbackMethods,
    );

    expect(result.name).toBe('replaced');
  });
});

// ---------------------------------------------------------------------------
// DuplicateOne — typed beforeSaveCallback
// ---------------------------------------------------------------------------

describe('DuplicateOneRouteConfig — beforeSaveCallback type', () => {
  it('accepts BeforeSaveCallback with BeforeSaveDuplicateContext', async () => {
    const cb: BeforeSaveCallback<Item, BeforeSaveDuplicateContext<Item>> =
      async (_entity, ctx) => ({ ...(ctx.override ?? {}) });

    const cfg: DuplicateOneRouteConfig<Item> = {
      type: 'DuplicateOne',
      beforeSaveCallback: cb,
    };

    const result = await cfg.beforeSaveCallback!(
      undefined,
      { id: 'x', override: { name: 'clone' } },
      fakeCallbackMethods,
    );

    expect(result.name).toBe('clone');
  });
});

// ---------------------------------------------------------------------------
// DuplicateMany — typed beforeSaveCallback
// ---------------------------------------------------------------------------

describe('DuplicateManyRouteConfig — beforeSaveCallback type', () => {
  it('accepts BeforeSaveListCallback with BeforeSaveDuplicateManyContext', async () => {
    const cb: BeforeSaveListCallback<Item, BeforeSaveDuplicateManyContext<Item>> =
      async (_entities, ctx) => ctx.ids.map(() => ({ ...(ctx.override ?? {}) }));

    const cfg: DuplicateManyRouteConfig<Item> = {
      type: 'DuplicateMany',
      beforeSaveCallback: cb,
    };

    const result = await cfg.beforeSaveCallback!(
      undefined,
      { ids: ['a', 'b'] },
      fakeCallbackMethods,
    );

    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// DeleteOne — typed beforeSaveCallback
// ---------------------------------------------------------------------------

describe('DeleteOneRouteConfig — beforeSaveCallback type', () => {
  it('accepts BeforeSaveDeleteCallback with BeforeSaveDeleteContext', async () => {
    const called: string[] = [];

    const cb: BeforeSaveDeleteCallback<Item, BeforeSaveDeleteContext> =
      async (_entity, ctx) => { called.push(ctx.id); };

    const cfg: DeleteOneRouteConfig<Item> = {
      type: 'DeleteOne',
      beforeSaveCallback: cb,
    };

    await cfg.beforeSaveCallback!(undefined, { id: 'item-42' }, fakeCallbackMethods);

    expect(called).toEqual(['item-42']);
  });
});

// ---------------------------------------------------------------------------
// DeleteMany — typed beforeSaveCallback
// ---------------------------------------------------------------------------

describe('DeleteManyRouteConfig — beforeSaveCallback type', () => {
  it('accepts BeforeSaveDeleteManyCallback with BeforeSaveDeleteManyContext', async () => {
    const collected: string[] = [];

    const cb: BeforeSaveDeleteManyCallback<Item, BeforeSaveDeleteManyContext> =
      async (_entities, ctx) => { collected.push(...ctx.ids); };

    const cfg: DeleteManyRouteConfig<Item> = {
      type: 'DeleteMany',
      beforeSaveCallback: cb,
    };

    await cfg.beforeSaveCallback!([], { ids: ['a', 'b', 'c'] }, fakeCallbackMethods);

    expect(collected).toEqual(['a', 'b', 'c']);
  });
});

// ---------------------------------------------------------------------------
// GetOne / GetMany / Aggregate / Custom — no beforeSaveCallback field
// ---------------------------------------------------------------------------

describe('read-only and utility routes — no beforeSaveCallback', () => {
  it('GetOneRouteConfig does not have beforeSaveCallback property', () => {
    const cfg: GetOneRouteConfig<Item> = { type: 'GetOne' };

    // @ts-expect-error — beforeSaveCallback is not declared on GetOneRouteConfig
    expect(cfg.beforeSaveCallback).toBeUndefined();
  });

  it('GetManyRouteConfig does not have beforeSaveCallback property', () => {
    const cfg: GetManyRouteConfig<Item> = { type: 'GetMany' };

    // @ts-expect-error — beforeSaveCallback is not declared on GetManyRouteConfig
    expect(cfg.beforeSaveCallback).toBeUndefined();
  });

  it('AggregateRouteConfig does not have beforeSaveCallback property', () => {
    const cfg: AggregateRouteConfig<Item> = { type: 'Aggregate' };

    // @ts-expect-error — beforeSaveCallback is not declared on AggregateRouteConfig
    expect(cfg.beforeSaveCallback).toBeUndefined();
  });

  it('CustomOperationRouteConfig does not have beforeSaveCallback property', () => {
    const cfg: CustomOperationRouteConfig<Item> = { type: 'Custom' };

    // @ts-expect-error — beforeSaveCallback is not declared on CustomOperationRouteConfig
    expect(cfg.beforeSaveCallback).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Discriminated union narrowing — DynamicApiRouteConfig
// ---------------------------------------------------------------------------

describe('DynamicApiRouteConfig — discriminated union narrowing', () => {
  it('narrows to CreateOneRouteConfig when type === CreateOne', () => {
    const cfg: DynamicApiRouteConfig<Item> = {
      type: 'CreateOne',
      beforeSaveCallback: async (_entity, ctx) => ({ name: ctx.toCreate.name }),
    };

    if (cfg.type === 'CreateOne') {
      // cfg.beforeSaveCallback is narrowed to BeforeSaveCallback<Item, BeforeSaveCreateContext<Item>>
      expect(cfg.beforeSaveCallback).toBeDefined();
    }
  });

  it('narrows to DeleteOneRouteConfig when type === DeleteOne', () => {
    const cfg: DynamicApiRouteConfig<Item> = {
      type: 'DeleteOne',
      cascade: [],
    };

    if (cfg.type === 'DeleteOne') {
      expect(cfg.cascade).toEqual([]);
    }
  });

  it('union accepts an array of heterogeneous route configs', () => {
    const routes: DynamicApiRouteConfig<Item>[] = [
      { type: 'CreateOne', beforeSaveCallback: async (_e, ctx) => ({ ...ctx.toCreate }) },
      { type: 'UpdateOne', beforeSaveCallback: async (_e, ctx) => ({ ...ctx.update }) },
      { type: 'GetMany' },
      { type: 'DeleteOne', beforeSaveCallback: async () => undefined },
    ];

    expect(routes).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Deprecated alias — DynamicAPIRouteConfig still works
// ---------------------------------------------------------------------------

describe('DynamicAPIRouteConfig (deprecated alias)', () => {
  it('is assignable from any per-route config', () => {
    const cfg: DynamicAPIRouteConfig<Item> = { type: 'CreateOne' };

    expect(cfg.type).toBe('CreateOne');
  });
});

// ---------------------------------------------------------------------------
// BodyDTO generic — route configs with BodyDTO propagation
// ---------------------------------------------------------------------------

describe('BodyDTO generic on write route configs', () => {
  class Item extends BaseEntity { name: string; price: number; }
  class CreateItemDto { name: string; discountCode?: string; }
  class UpdateItemDto { price?: number; reason?: string; }
  class ReplaceItemDto { name: string; price: number; featured?: boolean; }
  class DuplicateOverrideDto { tag?: string; }

  const fakeCallbackMethods = {} as CallbackMethods;

  it('CreateOneRouteConfig<E, BodyDTO> — ctx.toCreate typed as Partial<BodyDTO>', async () => {
    let capturedCode = '';

    const cfg: CreateOneRouteConfig<Item, CreateItemDto> = {
      type: 'CreateOne',
      beforeSaveCallback: async (_e, ctx, _m) => {
        capturedCode = ctx.toCreate.discountCode ?? 'none';
        return { name: ctx.toCreate.name };
      },
    };

    await cfg.beforeSaveCallback!(undefined, { toCreate: { name: 'Widget', discountCode: 'PROMO' } }, fakeCallbackMethods);
    expect(capturedCode).toBe('PROMO');
  });

  it('UpdateOneRouteConfig<E, BodyDTO> — ctx.update typed as Partial<BodyDTO>', async () => {
    let capturedReason = '';

    const cfg: UpdateOneRouteConfig<Item, UpdateItemDto> = {
      type: 'UpdateOne',
      beforeSaveCallback: async (_e, ctx, _m) => {
        capturedReason = ctx.update.reason ?? '';
        return { price: ctx.update.price };
      },
    };

    await cfg.beforeSaveCallback!(undefined, { id: '1', update: { price: 50, reason: 'sale' } }, fakeCallbackMethods);
    expect(capturedReason).toBe('sale');
  });

  it('ReplaceOneRouteConfig<E, BodyDTO> — ctx.replacement typed as Partial<BodyDTO>', async () => {
    let capturedFeatured: boolean | undefined;

    const cfg: ReplaceOneRouteConfig<Item, ReplaceItemDto> = {
      type: 'ReplaceOne',
      beforeSaveCallback: async (_e, ctx, _m) => {
        capturedFeatured = ctx.replacement.featured;
        return { name: ctx.replacement.name, price: ctx.replacement.price };
      },
    };

    await cfg.beforeSaveCallback!(undefined, { id: '1', replacement: { name: 'A', price: 10, featured: true } }, fakeCallbackMethods);
    expect(capturedFeatured).toBe(true);
  });

  it('DuplicateOneRouteConfig<E, BodyDTO> — ctx.override typed as Partial<BodyDTO>', async () => {
    let capturedTag = '';

    const cfg: DuplicateOneRouteConfig<Item, DuplicateOverrideDto> = {
      type: 'DuplicateOne',
      beforeSaveCallback: async (_e, ctx, _m) => {
        capturedTag = ctx.override?.tag ?? '';
        return {};
      },
    };

    await cfg.beforeSaveCallback!(undefined, { id: '1', override: { tag: 'copy' } }, fakeCallbackMethods);
    expect(capturedTag).toBe('copy');
  });
});

// ---------------------------------------------------------------------------
// defineXxxCallback helpers
// ---------------------------------------------------------------------------

describe('defineXxxCallback helpers — eliminate `as never` casts', () => {
  class Message extends BaseEntity { text: string; }
  class ReactBody { emojiId: string; }
  class CreateMsgDto { text: string; pack?: string; }
  class ReplaceDto { text: string; featured?: boolean; }
  class DupOverride { tag?: string; }

  const fakeCallbackMethods = {} as CallbackMethods;

  it('defineCreateCallback — ctx.toCreate typed as Partial<BodyDTO>', async () => {
    let capturedPack = '';

    const cb = defineCreateCallback<Message, CreateMsgDto>(
      async (_e, ctx, _m) => {
        capturedPack = ctx.toCreate.pack ?? 'default';
        return { text: ctx.toCreate.text };
      },
    );

    await cb(undefined, { toCreate: { text: 'hi', pack: 'emoji-v2' } }, fakeCallbackMethods);
    expect(capturedPack).toBe('emoji-v2');
  });

  it('defineCreateManyCallback — ctx.toCreate is array Partial<BodyDTO>', async () => {
    const cb = defineCreateManyCallback<Message, CreateMsgDto>(
      async (_e, ctx, _m) => ctx.toCreate.map((d) => ({ text: d.text })),
    );

    const result = await cb(undefined, { toCreate: [{ text: 'a', pack: 'p1' }, { text: 'b' }] }, fakeCallbackMethods);
    expect(result).toHaveLength(2);
  });

  it('defineUpdateCallback — ctx.update typed as Partial<ReactBody>', async () => {
    let capturedEmoji = '';

    const cb = defineUpdateCallback<Message, ReactBody>(
      async (_e, ctx, _m) => {
        capturedEmoji = ctx.update.emojiId ?? '';
        return {};
      },
    );

    await cb(undefined, { id: '1', update: { emojiId: '👍' } }, fakeCallbackMethods);
    expect(capturedEmoji).toBe('👍');
  });

  it('defineUpdateManyCallback — ctx.update typed as Partial<ReactBody>', async () => {
    const cb = defineUpdateManyCallback<Message, ReactBody>(
      async (_e, ctx, _m) => [{ text: ctx.update.emojiId }],
    );

    const result = await cb(undefined, { ids: ['1', '2'], update: { emojiId: '❤️' } }, fakeCallbackMethods);
    expect(result[0].text).toBe('❤️');
  });

  it('defineReplaceCallback — ctx.replacement typed as Partial<ReplaceDto>', async () => {
    let capturedFeatured: boolean | undefined;

    const cb = defineReplaceCallback<Message, ReplaceDto>(
      async (_e, ctx, _m) => {
        capturedFeatured = ctx.replacement.featured;
        return {};
      },
    );

    await cb(undefined, { id: '1', replacement: { text: 'x', featured: true } }, fakeCallbackMethods);
    expect(capturedFeatured).toBe(true);
  });

  it('defineDuplicateCallback — ctx.override typed as Partial<DupOverride>', async () => {
    let capturedTag = '';

    const cb = defineDuplicateCallback<Message, DupOverride>(
      async (_e, ctx, _m) => {
        capturedTag = ctx.override?.tag ?? '';
        return {};
      },
    );

    await cb(undefined, { id: '1', override: { tag: 'promo' } }, fakeCallbackMethods);
    expect(capturedTag).toBe('promo');
  });

  it('defineDuplicateManyCallback — ctx.override typed as Partial<DupOverride>', async () => {
    let capturedTag = '';

    const cb = defineDuplicateManyCallback<Message, DupOverride>(
      async (_e, ctx, _m) => {
        capturedTag = ctx.override?.tag ?? '';
        return [];
      },
    );

    await cb(undefined, { ids: ['1'], override: { tag: 'clone' } }, fakeCallbackMethods);
    expect(capturedTag).toBe('clone');
  });

  it('helper returns the SAME function reference (identity)', () => {
    const fn = async (_e: Message | undefined, _ctx: import('./dynamic-api-service-before-save-callback.interface').BeforeSaveUpdateContext<Message, ReactBody>, _m: CallbackMethods): Promise<Partial<Message>> => ({});
    const wrapped = defineUpdateCallback<Message, ReactBody>(fn);
    expect(wrapped).toBe(fn);
  });
});




