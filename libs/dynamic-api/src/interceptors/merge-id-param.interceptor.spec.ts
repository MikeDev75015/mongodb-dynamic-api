import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { MergeIdParamInterceptor } from './merge-id-param.interceptor';

describe('MergeIdParamInterceptor', () => {
  let interceptor: MergeIdParamInterceptor;
  let next: CallHandler;

  const contextFor = (request: unknown): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext);

  beforeEach(() => {
    interceptor = new MergeIdParamInterceptor();
    next = { handle: jest.fn().mockReturnValue(of('handled')) };
  });

  it('copies the route param id onto the body before calling next.handle()', () => {
    const request = { body: { email: 'a@test.com' }, params: { id: 'entity-1' } };

    interceptor.intercept(contextFor(request), next);

    expect(request.body).toEqual({ email: 'a@test.com', id: 'entity-1' });
    expect(next.handle).toHaveBeenCalled();
  });

  it('overwrites a client-supplied id in the body with the route param', () => {
    const request = { body: { id: 'spoofed-id', email: 'a@test.com' }, params: { id: 'entity-1' } };

    interceptor.intercept(contextFor(request), next);

    expect(request.body.id).toBe('entity-1');
  });

  it('does nothing when there is no body', () => {
    const request = { body: undefined, params: { id: 'entity-1' } };

    expect(() => interceptor.intercept(contextFor(request), next)).not.toThrow();
    expect(request.body).toBeUndefined();
  });

  it('does nothing when the body is not an object', () => {
    const request = { body: 'raw-string-body', params: { id: 'entity-1' } };

    interceptor.intercept(contextFor(request), next);

    expect(request.body).toBe('raw-string-body');
  });

  it('does nothing when there is no id route param', () => {
    const request = { body: { email: 'a@test.com' }, params: {} };

    interceptor.intercept(contextFor(request), next);

    expect(request.body).toEqual({ email: 'a@test.com' });
  });

  it('returns the observable from next.handle()', () => {
    const request = { body: {}, params: { id: 'entity-1' } };

    const result = interceptor.intercept(contextFor(request), next);

    expect(next.handle).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
