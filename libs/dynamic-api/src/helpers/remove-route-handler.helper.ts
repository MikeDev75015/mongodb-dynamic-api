/**
 * Deletes a decorated handler from a controller or gateway prototype so NestJS never declares it:
 * the HTTP route answers 404 and is absent from Swagger, the socket event is never listened for.
 * Route metadata (`@Post`, `@UseGuards`, `@SubscribeMessage`…) lives on the method itself, so
 * removing the method is enough — the class keeps every other handler untouched.
 *
 * @internal Not part of the public API.
 */
function removeRouteHandler(prototype: object, handler: string): void {
  Reflect.deleteProperty(prototype, handler);
}

export { removeRouteHandler };
