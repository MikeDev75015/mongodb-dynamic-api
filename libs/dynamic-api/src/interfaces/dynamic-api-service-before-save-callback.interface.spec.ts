import { BaseEntity } from '../models';
import {
  BeforeSaveCallback,
  BeforeSaveCreateContext,
  BeforeSaveCreateManyContext,
  BeforeSaveDeleteCallback,
  BeforeSaveDeleteManyCallback,
  BeforeSaveDeleteContext,
  BeforeSaveDeleteManyContext,
  BeforeSaveDuplicateContext,
  BeforeSaveDuplicateManyContext,
  BeforeSaveListCallback,
  BeforeSaveReplaceContext,
  BeforeSaveUpdateContext,
  BeforeSaveUpdateManyContext,
  DynamicApiServiceBeforeSaveCreateContext,
  DynamicApiServiceBeforeSaveCreateManyContext,
  DynamicApiServiceBeforeSaveUpdateContext,
  DynamicApiServiceBeforeSaveUpdateManyContext,
  DynamicApiServiceBeforeSaveReplaceContext,
  DynamicApiServiceBeforeSaveDuplicateContext,
  DynamicApiServiceBeforeSaveDuplicateManyContext,
} from './dynamic-api-service-before-save-callback.interface';

// ---------------------------------------------------------------------------
// Domain fixtures
// ---------------------------------------------------------------------------

class MessageEntity extends BaseEntity {
  text: string;
  authorId: string;
}

/** Custom body DTO — has an extra field `emojiPack` absent from MessageEntity. */
class CreateMessageDto {
  text: string;
  emojiPack?: string;
}

class UpdateMessageDto {
  text?: string;
  pinned?: boolean;
}

class ReplaceMessageDto {
  text: string;
  authorId: string;
  featured?: boolean;
}

class DuplicateOverrideDto {
  text?: string;
  tag?: string;
}

// ---------------------------------------------------------------------------
// BeforeSaveCreateContext
// ---------------------------------------------------------------------------

describe('BeforeSaveCreateContext', () => {
  describe('default (BodyDTO = Entity)', () => {
    it('should have toCreate typed as Partial<MessageEntity>', () => {
      const ctx: BeforeSaveCreateContext<MessageEntity> = {
        toCreate: { text: 'hello', authorId: 'user-1' },
      };

      expect(ctx.toCreate.text).toBe('hello');
      expect(ctx.toCreate.authorId).toBe('user-1');
    });

    it('should accept partial fields', () => {
      const ctx: BeforeSaveCreateContext<MessageEntity> = {
        toCreate: {},
      };

      expect(ctx.toCreate).toEqual({});
    });
  });

  describe('custom BodyDTO', () => {
    it('should have toCreate typed as Partial<CreateMessageDto>', () => {
      const ctx: BeforeSaveCreateContext<MessageEntity, CreateMessageDto> = {
        toCreate: { text: 'hello', emojiPack: 'twemoji' },
      };

      expect(ctx.toCreate.text).toBe('hello');
      expect(ctx.toCreate.emojiPack).toBe('twemoji');
    });

    it('should accept only BodyDTO fields (no Entity-only fields required)', () => {
      const ctx: BeforeSaveCreateContext<MessageEntity, CreateMessageDto> = {
        toCreate: { emojiPack: 'noto' },
      };

      expect(ctx.toCreate.emojiPack).toBe('noto');
      expect(ctx.toCreate.text).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// BeforeSaveCreateManyContext
// ---------------------------------------------------------------------------

describe('BeforeSaveCreateManyContext', () => {
  describe('default (BodyDTO = Entity)', () => {
    it('should have toCreate typed as Partial<MessageEntity>[]', () => {
      const ctx: BeforeSaveCreateManyContext<MessageEntity> = {
        toCreate: [{ text: 'a' }, { text: 'b', authorId: 'user-2' }],
      };

      expect(ctx.toCreate).toHaveLength(2);
      expect(ctx.toCreate[0].text).toBe('a');
    });
  });

  describe('custom BodyDTO', () => {
    it('should have toCreate typed as Partial<CreateMessageDto>[]', () => {
      const ctx: BeforeSaveCreateManyContext<MessageEntity, CreateMessageDto> = {
        toCreate: [
          { text: 'hello', emojiPack: 'twemoji' },
          { emojiPack: 'noto' },
        ],
      };

      expect(ctx.toCreate[0].emojiPack).toBe('twemoji');
      expect(ctx.toCreate[1].text).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// BeforeSaveUpdateContext
// ---------------------------------------------------------------------------

describe('BeforeSaveUpdateContext', () => {
  describe('default (BodyDTO = Entity)', () => {
    it('should have id + update typed as Partial<MessageEntity>', () => {
      const ctx: BeforeSaveUpdateContext<MessageEntity> = {
        id: 'doc-1',
        update: { text: 'updated' },
      };

      expect(ctx.id).toBe('doc-1');
      expect(ctx.update.text).toBe('updated');
    });
  });

  describe('custom BodyDTO', () => {
    it('should have update typed as Partial<UpdateMessageDto>', () => {
      const ctx: BeforeSaveUpdateContext<MessageEntity, UpdateMessageDto> = {
        id: 'doc-1',
        update: { text: 'new text', pinned: true },
      };

      expect(ctx.update.pinned).toBe(true);
      expect(ctx.id).toBe('doc-1');
    });
  });
});

// ---------------------------------------------------------------------------
// BeforeSaveUpdateManyContext
// ---------------------------------------------------------------------------

describe('BeforeSaveUpdateManyContext', () => {
  describe('default (BodyDTO = Entity)', () => {
    it('should have ids + update typed as Partial<MessageEntity>', () => {
      const ctx: BeforeSaveUpdateManyContext<MessageEntity> = {
        ids: ['doc-1', 'doc-2'],
        update: { authorId: 'user-3' },
      };

      expect(ctx.ids).toEqual(['doc-1', 'doc-2']);
      expect(ctx.update.authorId).toBe('user-3');
    });
  });

  describe('custom BodyDTO', () => {
    it('should have update typed as Partial<UpdateMessageDto>', () => {
      const ctx: BeforeSaveUpdateManyContext<MessageEntity, UpdateMessageDto> = {
        ids: ['a', 'b'],
        update: { pinned: false },
      };

      expect(ctx.update.pinned).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// BeforeSaveReplaceContext
// ---------------------------------------------------------------------------

describe('BeforeSaveReplaceContext', () => {
  describe('default (BodyDTO = Entity)', () => {
    it('should have id + replacement typed as Partial<MessageEntity>', () => {
      const ctx: BeforeSaveReplaceContext<MessageEntity> = {
        id: 'doc-1',
        replacement: { text: 'full replacement', authorId: 'user-4' },
      };

      expect(ctx.replacement.text).toBe('full replacement');
    });
  });

  describe('custom BodyDTO', () => {
    it('should have replacement typed as Partial<ReplaceMessageDto>', () => {
      const ctx: BeforeSaveReplaceContext<MessageEntity, ReplaceMessageDto> = {
        id: 'doc-1',
        replacement: { text: 'new', authorId: 'user-4', featured: true },
      };

      expect(ctx.replacement.featured).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// BeforeSaveDuplicateContext
// ---------------------------------------------------------------------------

describe('BeforeSaveDuplicateContext', () => {
  describe('default (BodyDTO = Entity)', () => {
    it('should have id required and override optional (Partial<MessageEntity>)', () => {
      const withOverride: BeforeSaveDuplicateContext<MessageEntity> = {
        id: 'doc-1',
        override: { text: 'copy' },
      };
      const withoutOverride: BeforeSaveDuplicateContext<MessageEntity> = {
        id: 'doc-1',
      };

      expect(withOverride.override?.text).toBe('copy');
      expect(withoutOverride.override).toBeUndefined();
    });
  });

  describe('custom BodyDTO', () => {
    it('should have override typed as Partial<DuplicateOverrideDto>', () => {
      const ctx: BeforeSaveDuplicateContext<MessageEntity, DuplicateOverrideDto> = {
        id: 'doc-1',
        override: { text: 'cloned', tag: 'promo' },
      };

      expect(ctx.override?.tag).toBe('promo');
    });
  });
});

// ---------------------------------------------------------------------------
// BeforeSaveDuplicateManyContext
// ---------------------------------------------------------------------------

describe('BeforeSaveDuplicateManyContext', () => {
  describe('default (BodyDTO = Entity)', () => {
    it('should have ids required and override optional (Partial<MessageEntity>)', () => {
      const ctx: BeforeSaveDuplicateManyContext<MessageEntity> = {
        ids: ['a', 'b'],
        override: { text: 'batch copy' },
      };

      expect(ctx.ids).toHaveLength(2);
      expect(ctx.override?.text).toBe('batch copy');
    });
  });

  describe('custom BodyDTO', () => {
    it('should have override typed as Partial<DuplicateOverrideDto>', () => {
      const ctx: BeforeSaveDuplicateManyContext<MessageEntity, DuplicateOverrideDto> = {
        ids: ['a', 'b'],
        override: { tag: 'featured' },
      };

      expect(ctx.override?.tag).toBe('featured');
    });
  });
});

// ---------------------------------------------------------------------------
// BeforeSaveDeleteContext / BeforeSaveDeleteManyContext (unchanged — no BodyDTO)
// ---------------------------------------------------------------------------

describe('BeforeSaveDeleteContext', () => {
  it('should have id field only', () => {
    const ctx: BeforeSaveDeleteContext = { id: 'doc-1' };
    expect(ctx.id).toBe('doc-1');
  });
});

describe('BeforeSaveDeleteManyContext', () => {
  it('should have ids field only', () => {
    const ctx: BeforeSaveDeleteManyContext = { ids: ['a', 'b'] };
    expect(ctx.ids).toEqual(['a', 'b']);
  });
});

// ---------------------------------------------------------------------------
// Callback type with BodyDTO context — no cast needed
// ---------------------------------------------------------------------------

describe('BeforeSaveCallback with BodyDTO context', () => {
  it('should allow callback typed with custom BodyDTO context without cast', async () => {
    const cb: BeforeSaveCallback<
      MessageEntity,
      BeforeSaveCreateContext<MessageEntity, CreateMessageDto>
    > = async (_entity, ctx, _methods, _user) => {
      // ctx.toCreate is Partial<CreateMessageDto> — emojiPack accessible without cast
      const result: Partial<MessageEntity> = { text: ctx.toCreate.text };
      return result;
    };

    const mockCtx: BeforeSaveCreateContext<MessageEntity, CreateMessageDto> = {
      toCreate: { text: 'hi', emojiPack: 'twemoji' },
    };

    const result = await cb(
      undefined,
      mockCtx,
      {} as Parameters<typeof cb>[2],
      undefined,
    );

    expect(result).toEqual({ text: 'hi' });
  });

  it('should allow BeforeSaveListCallback with custom BodyDTO context', async () => {
    const cb: BeforeSaveListCallback<
      MessageEntity,
      BeforeSaveCreateManyContext<MessageEntity, CreateMessageDto>
    > = async (_entities, ctx, _methods, _user) => {
      return ctx.toCreate.map((item) => ({ text: item.text }));
    };

    const mockCtx: BeforeSaveCreateManyContext<MessageEntity, CreateMessageDto> = {
      toCreate: [
        { text: 'a', emojiPack: 'twemoji' },
        { text: 'b' },
      ],
    };

    const result = await cb(
      undefined,
      mockCtx,
      {} as Parameters<typeof cb>[2],
      undefined,
    );

    expect(result).toEqual([{ text: 'a' }, { text: 'b' }]);
  });

  it('should allow BeforeSaveDeleteCallback (no BodyDTO — unchanged)', async () => {
    const cb: BeforeSaveDeleteCallback<MessageEntity, BeforeSaveDeleteContext> =
      async (_entity, ctx, _methods, _user) => {
        expect(ctx.id).toBe('doc-1');
      };

    await cb(
      undefined,
      { id: 'doc-1' },
      {} as Parameters<typeof cb>[2],
      undefined,
    );
  });

  it('should allow BeforeSaveDeleteManyCallback (no BodyDTO — unchanged)', async () => {
    const cb: BeforeSaveDeleteManyCallback<MessageEntity, BeforeSaveDeleteManyContext> =
      async (_entities, ctx, _methods, _user) => {
        expect(ctx.ids).toEqual(['a', 'b']);
      };

    await cb(
      [],
      { ids: ['a', 'b'] },
      {} as Parameters<typeof cb>[2],
      undefined,
    );
  });
});

// ---------------------------------------------------------------------------
// Deprecated aliases — BodyDTO propagation
// ---------------------------------------------------------------------------

describe('deprecated aliases — BodyDTO propagation', () => {
  it('DynamicApiServiceBeforeSaveCreateContext should propagate BodyDTO', () => {
    const ctx: DynamicApiServiceBeforeSaveCreateContext<MessageEntity, CreateMessageDto> = {
      toCreate: { text: 'msg', emojiPack: 'twemoji' },
    };
    expect(ctx.toCreate.emojiPack).toBe('twemoji');
  });

  it('DynamicApiServiceBeforeSaveCreateManyContext should propagate BodyDTO', () => {
    const ctx: DynamicApiServiceBeforeSaveCreateManyContext<MessageEntity, CreateMessageDto> = {
      toCreate: [{ emojiPack: 'noto' }],
    };
    expect(ctx.toCreate[0].emojiPack).toBe('noto');
  });

  it('DynamicApiServiceBeforeSaveUpdateContext should propagate BodyDTO', () => {
    const ctx: DynamicApiServiceBeforeSaveUpdateContext<MessageEntity, UpdateMessageDto> = {
      id: 'x',
      update: { pinned: true },
    };
    expect(ctx.update.pinned).toBe(true);
  });

  it('DynamicApiServiceBeforeSaveUpdateManyContext should propagate BodyDTO', () => {
    const ctx: DynamicApiServiceBeforeSaveUpdateManyContext<MessageEntity, UpdateMessageDto> = {
      ids: ['a'],
      update: { pinned: false },
    };
    expect(ctx.update.pinned).toBe(false);
  });

  it('DynamicApiServiceBeforeSaveReplaceContext should propagate BodyDTO', () => {
    const ctx: DynamicApiServiceBeforeSaveReplaceContext<MessageEntity, ReplaceMessageDto> = {
      id: 'x',
      replacement: { text: 'r', authorId: 'u', featured: true },
    };
    expect(ctx.replacement.featured).toBe(true);
  });

  it('DynamicApiServiceBeforeSaveDuplicateContext should propagate BodyDTO', () => {
    const ctx: DynamicApiServiceBeforeSaveDuplicateContext<MessageEntity, DuplicateOverrideDto> = {
      id: 'x',
      override: { tag: 'promo' },
    };
    expect(ctx.override?.tag).toBe('promo');
  });

  it('DynamicApiServiceBeforeSaveDuplicateManyContext should propagate BodyDTO', () => {
    const ctx: DynamicApiServiceBeforeSaveDuplicateManyContext<MessageEntity, DuplicateOverrideDto> = {
      ids: ['a', 'b'],
      override: { tag: 'sale' },
    };
    expect(ctx.override?.tag).toBe('sale');
  });
});


