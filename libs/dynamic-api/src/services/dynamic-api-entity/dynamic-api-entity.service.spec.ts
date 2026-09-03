import { describe, expect, it, vi } from 'vitest';
import { DynamicApiGlobalStateService } from '../dynamic-api-global-state/dynamic-api-global-state.service';
import { DynamicApiEntityService } from './dynamic-api-entity.service';

describe('DynamicApiEntityService', () => {
  class Entity {}

  it('should delegate getModel to DynamicApiGlobalStateService.getEntityModel', async () => {
    const model = { find: vi.fn() };
    const getEntityModelSpy = vi
      .spyOn(DynamicApiGlobalStateService, 'getEntityModel')
      .mockResolvedValue(model as any);

    const result = await DynamicApiEntityService.getModel(Entity);

    expect(getEntityModelSpy).toHaveBeenCalledWith(Entity);
    expect(result).toBe(model);

    getEntityModelSpy.mockRestore();
  });
});
