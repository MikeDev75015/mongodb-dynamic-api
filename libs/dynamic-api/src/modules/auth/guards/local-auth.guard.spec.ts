import { LocalAuthGuard } from './local-auth.guard';


describe('LocalAuthGuard', () => {
  let guard: LocalAuthGuard;

  beforeEach(async () => {
    guard = new LocalAuthGuard();
  });

  it('should have auth guard methods', () => {
    expect(guard).toBeDefined();
    expect(guard.logIn).toStrictEqual(expect.any(Function));
    expect(guard.handleRequest).toStrictEqual(expect.any(Function));
    expect(guard.getAuthenticateOptions).toStrictEqual(expect.any(Function));
    expect(guard.getRequest).toStrictEqual(expect.any(Function));
  });
});