Changelog

## [4.20.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.19.0...v4.20.0) (2026-08-16)

### ci

* **ci:** skip CI for the auto-generated release commit ([8b8e1e5](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/8b8e1e542af780a657ba480085b63e2cc53f9a88))
* **ci:** stop e2e job from reusing a poisoned mongodb-memory-server binary cache ([fa03d8f](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/fa03d8f00c37a8f67fe936545e73aaa1295b25c0))
* **ci:** stop npm publish from re-running a broken build inside dist/ ([2bcc32c](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/2bcc32c60e590c7e9eed4921ac848e4adb4a89c9))

### quality

* **quality:** replace cascade boolean-flag method with two methods (S2301) ([526f23b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/526f23b4b6ce4362381c75b58d225575adeb2dfd))
* **quality:** resolve 11 SonarCloud leak-period issues on develop ([aed6dda](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/aed6ddad3eeb3f5c40fef2d30973322d89303818))

### schematics

* **schematics:** add Nest CLI resource schematic ([978e9df](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/978e9dfb5a313565172c57de7e251c07dee2ad35))

### routes

* **routes:** add opt-in per-route audit log ([9321fec](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/9321fecad59fa34356f87946e88f7389d0662503))
* **routes:** add populate to GetOne/GetMany route config ([d5462ef](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/d5462effb48651dff2554ac27ec255826460edb9))

### cascade

* **cascade:** wrap cascade deletes in a MongoDB transaction ([d3991aa](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/d3991aa9fb244acdea65eb8cf2a0bed98841cff4))

### auth

* **auth:** add mintTokenPair for issuing tokens outside /auth/login ([747392b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/747392b16230d5ebc6d25d8d6db5464ed7903d4c))
* **auth:** add per-route rate limiting for sensitive auth routes ([282c93c](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/282c93cf377baed45eca4df99253c64f5481f421))

### testing

* **testing:** add createDynamicApiTestingApp with in-memory MongoDB ([9fdd4e1](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/9fdd4e1e6a120e387d78a6870bfd27f21dff2230))

### health

* **health:** add DynamicApiHealthModule readiness probe ([1e96eb9](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/1e96eb948ae69fa8df0616c5f803b7fcfa1ee37d))

### helpers

* **helpers:** add enableDynamicAPIIndexSync with actionable E11000 errors ([cb756c8](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/cb756c877bd9dfdcd81fc99d9601894e4a9843d5))

### guards

* **guards:** log the real rejection reason of DynamicApiJwtAuthGuard ([a609b27](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/a609b270d38269f3e1984ae24ae430e3072d9d65))

## [4.19.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.17.0...v4.19.0) (2026-08-16)

### quality

* **quality:** replace cascade boolean-flag method with two methods (S2301) ([0b4294e](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/0b4294e7f721c52c1ae01ff3f24a583a0e7b6b1f))
* **quality:** resolve 11 SonarCloud leak-period issues on develop ([7543eee](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/7543eeeaa64c12d68a8261b14881ac9844e3bd7d))

### ci

* **ci:** stop e2e job from reusing a poisoned mongodb-memory-server binary cache ([9fc307c](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/9fc307cfac4c9d6c388cbcf4da18d3f3f8d701db))

### schematics

* **schematics:** add Nest CLI resource schematic ([a75d28b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/a75d28b64288c54d61dd30955b631cb3c437231f))

### routes

* **routes:** add opt-in per-route audit log ([50bb97b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/50bb97b1888ded816b664207c8ef1f19140188f6))
* **routes:** add populate to GetOne/GetMany route config ([b0c3d7e](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/b0c3d7ea92a5ae91b476b6e540911ffebad4622e))
* **routes:** merge the :id route param into UpdateOne's body before validation ([26bbf26](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/26bbf261c2fd306c8d094b54feb28a7446dd5d50))
* **routes:** return 400 instead of 500 on invalid *Many input ([c92c708](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/c92c708cee36a5336c185eb881348b05e8af7ea5))

### cascade

* **cascade:** wrap cascade deletes in a MongoDB transaction ([34b375a](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/34b375a9fdf98ef213bc308823d1275bb78e2553))

### auth

* **auth:** add mintTokenPair for issuing tokens outside /auth/login ([8f874cb](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/8f874cba850955ae44537315ff5ac75dc2ec28ee))
* **auth:** add per-route rate limiting for sensitive auth routes ([1db6bf6](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/1db6bf6eee5620c76f9046ba9ae897d61ca202c4))
* **auth:** strip DB-aware business validators from the generated login DTO ([1794b47](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/1794b473d1a70d57814b7b45d6f7ebc39880865b))

### testing

* **testing:** add createDynamicApiTestingApp with in-memory MongoDB ([82e11d7](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/82e11d788bcf3e406b3d55a9f38fafb47ea3268d))

### health

* **health:** add DynamicApiHealthModule readiness probe ([5cc364b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/5cc364b7c83a5a593799fe1528bc0248b06079de))

### helpers

* **helpers:** add enableDynamicAPIIndexSync with actionable E11000 errors ([ea532b9](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/ea532b946c916b0fecc9298c5cdb930ff30e5264))

### guards

* **guards:** log the real rejection reason of DynamicApiJwtAuthGuard ([5a14de0](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/5a14de0492efb4c9a62869aa974acbf4474ea1c3))

### predicates

* **predicates:** coercion, fallback fields and custom compare for isOwner/isGroupMember ([dc391ef](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/dc391ef9e388ccbf12b97dcda71b7f28c1b2b9eb))
* **predicates:** guard identifiersMatch's String() fallback against plain objects ([9ac365b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/9ac365b6d0d172499b0821497acbd09f31e363a1))
* **predicates:** narrow identifiersMatch's operands to a stringifiable type ([7c8030d](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/7c8030d9310757f19b0b806e554050fbdfa3ad28))

### broadcast

* **broadcast:** catch a throwing resolveBroadcast() in broadcastFromHttp/broadcastIfNeeded ([582e7fb](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/582e7fbbe377a364c591b9895e96bf2fb2331ade))

### validators

* **validators:** guard IsUnique/EntityExists against malformed ObjectIds ([8c5096e](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/8c5096e70a3a63c59d9fb94784231f92e107745e))

## [4.18.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.17.0...v4.18.0) (2026-08-13)

### predicates

* **predicates:** coercion, fallback fields and custom compare for isOwner/isGroupMember ([dc391ef](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/dc391ef9e388ccbf12b97dcda71b7f28c1b2b9eb))
* **predicates:** guard identifiersMatch's String() fallback against plain objects ([9ac365b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/9ac365b6d0d172499b0821497acbd09f31e363a1))
* **predicates:** narrow identifiersMatch's operands to a stringifiable type ([7c8030d](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/7c8030d9310757f19b0b806e554050fbdfa3ad28))

### routes

* **routes:** merge the :id route param into UpdateOne's body before validation ([26bbf26](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/26bbf261c2fd306c8d094b54feb28a7446dd5d50))
* **routes:** return 400 instead of 500 on invalid *Many input ([c92c708](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/c92c708cee36a5336c185eb881348b05e8af7ea5))

### broadcast

* **broadcast:** catch a throwing resolveBroadcast() in broadcastFromHttp/broadcastIfNeeded ([582e7fb](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/582e7fbbe377a364c591b9895e96bf2fb2331ade))

### validators

* **validators:** guard IsUnique/EntityExists against malformed ObjectIds ([8c5096e](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/8c5096e70a3a63c59d9fb94784231f92e107745e))

### auth

* **auth:** strip DB-aware business validators from the generated login DTO ([1794b47](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/1794b473d1a70d57814b7b45d6f7ebc39880865b))

## [4.17.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.15.0...v4.17.0) (2026-08-12)

### routes

* **routes:** remove unused AfterSaveCallback import left by the callbackRetry bundling ([a2bb491](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/a2bb491fb214c958fb93e831cef3278ca4c99954))

### callbacks

* **callbacks:** add global onAfterSaveError hook via forRoot ([a206e64](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/a206e64eedcaf5779cd145d668a48156edec04b9))
* **callbacks:** add invokeAfterSaveCallback failure-isolation helper ([f5199be](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/f5199be7fab5220739af6e7d92954ea7b8d4b4a3))
* **callbacks:** isolate afterSaveCallback failures across all route types ([5886f67](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/5886f67c9bcfbc6896b0086280770ffd0597f2f6))

### predicates

* **predicates:** add standard ability predicate factories ([f55973e](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/f55973e720b076bc4116436cd6b5b051a9f62a4d))

### websockets

* **websockets:** add failOnEventCollision option to enableDynamicAPIWebSockets ([cfb71a1](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/cfb71a1dc0b4bd1eb2d1ee0c7d7b5f13324b6180))

### broadcast

* **broadcast:** add internal event registry with collision detection ([503c514](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/503c514a9d4253bc1d1358f0591a5108ba687fb8))
* **broadcast:** catch and log emit failures in HTTP and WS broadcast paths ([9981d89](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/9981d8933925e6ca5ea00404e3a797b705354888))
* **broadcast:** extract shared resolveBroadcast helper ([3890e95](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/3890e95caf85b94c1145b9be9fa8bbf74820f545))
* **broadcast:** register broadcast events in a central registry at mixin-setup time ([47fa642](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/47fa642866e9cace9d4f4caed0a66ee7e916d8bb))

### decorators

* **decorators:** add EntityExists DB-aware existence validator ([d070e2e](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/d070e2e4bf5987283690eceb6fe1be1abfb33ec8))
* **decorators:** add IsUnique DB-aware uniqueness validator ([e2c978b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/e2c978b4eead14286403c901a95f38a71ffc63f7))

## [4.16.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.15.0...v4.16.0) (2026-08-12)

### routes

* **routes:** remove unused AfterSaveCallback import left by the callbackRetry bundling ([a2bb491](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/a2bb491fb214c958fb93e831cef3278ca4c99954))

### callbacks

* **callbacks:** add global onAfterSaveError hook via forRoot ([a206e64](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/a206e64eedcaf5779cd145d668a48156edec04b9))
* **callbacks:** add invokeAfterSaveCallback failure-isolation helper ([f5199be](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/f5199be7fab5220739af6e7d92954ea7b8d4b4a3))
* **callbacks:** isolate afterSaveCallback failures across all route types ([5886f67](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/5886f67c9bcfbc6896b0086280770ffd0597f2f6))

### predicates

* **predicates:** add standard ability predicate factories ([f55973e](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/f55973e720b076bc4116436cd6b5b051a9f62a4d))

### websockets

* **websockets:** add failOnEventCollision option to enableDynamicAPIWebSockets ([cfb71a1](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/cfb71a1dc0b4bd1eb2d1ee0c7d7b5f13324b6180))

### broadcast

* **broadcast:** add internal event registry with collision detection ([503c514](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/503c514a9d4253bc1d1358f0591a5108ba687fb8))
* **broadcast:** catch and log emit failures in HTTP and WS broadcast paths ([9981d89](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/9981d8933925e6ca5ea00404e3a797b705354888))
* **broadcast:** extract shared resolveBroadcast helper ([3890e95](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/3890e95caf85b94c1145b9be9fa8bbf74820f545))
* **broadcast:** register broadcast events in a central registry at mixin-setup time ([47fa642](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/47fa642866e9cace9d4f4caed0a66ee7e916d8bb))

### decorators

* **decorators:** add EntityExists DB-aware existence validator ([d070e2e](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/d070e2e4bf5987283690eceb6fe1be1abfb33ec8))
* **decorators:** add IsUnique DB-aware uniqueness validator ([e2c978b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/e2c978b4eead14286403c901a95f38a71ffc63f7))

## [4.15.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.14.1...v4.15.0) (2026-05-31)

### auth

* **auth:** add grace window, rotate=false, and atomic CAS rotation for refresh tokens ([e62b77d](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/e62b77d3539abb3c7c50580a49888b5363bca310))

## [4.14.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.14.0...v4.14.1) (2026-05-27)

## [4.14.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.13.0...v4.14.0) (2026-05-26)

### typing

* **typing:** 6 upstream improvements — BeforeRegisterContext, TExtra, BodyDTO generics, customRoutes req/interceptors, WS customEvents ([bab7aec](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/bab7aecf5400954c6f21c1e99434174b892cde1d)), closes [#5](https://github.com/MikeDev75015/mongodb-dynamic-api/issues/5) [#2](https://github.com/MikeDev75015/mongodb-dynamic-api/issues/2) [#4](https://github.com/MikeDev75015/mongodb-dynamic-api/issues/4) [#3](https://github.com/MikeDev75015/mongodb-dynamic-api/issues/3) [#6](https://github.com/MikeDev75015/mongodb-dynamic-api/issues/6)

## [4.13.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.12.0...v4.13.0) (2026-05-26)

### route-config

* **route-config:** replace flat DynamicApiRouteConfig with discriminated union ([6046c61](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/6046c6159eb43e68d9efec5bc5890fd9f4c1aadb))

## [4.12.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.11.0...v4.12.0) (2026-05-26)

### auth

* **auth:** add passwordless OTP flow ([858cd49](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/858cd49e348127412e8eaf86f06d94d0784bef63))

## [4.11.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.10.0...v4.11.0) (2026-05-25)

### callbacks

* **callbacks:** add BodyDTO generic to beforeSave context types ([4c04c50](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/4c04c50f57e9b1e96d14f1eab83b45f76e2afd71))

### e2e

* **e2e:** cast user to UserEntity in websockets broadcast enabled predicate ([6ac68ef](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/6ac68ef1a5f206d129ee6395a7afb55dc1714962))

### broadcast

* **broadcast:** pass socket.user to rooms callback ([da6177f](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/da6177f307b3afb14e3b56bfef25c39d3ee9b514))

## [4.10.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.9.0...v4.10.0) (2026-05-25)

### custom-route

* **custom-route:** add WebSocket gateway support ([f7b54a4](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/f7b54a4))
* **custom-route:** remove unnecessary type casts in controller factory ([8448e8e](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/8448e8ee16c3ada8fdcb08c3d3252a05ca82b90a))
* **custom-route:** rename DynamicApiCustomRouteConfig to CustomRouteConfig ([4b67e6b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/4b67e6bffad70424d6898db3ffa47db0ac4e9a26))

### custom-routes

* **custom-routes:** add customRoutes option to forFeature() ([3a06adb](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/3a06adb032102233d9a13bab35f05a7e7fbcb19e))

## [4.9.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.8.0...v4.9.0) (2026-05-25)

### presence

* **presence:** add @Public() to PresenceController and fix e2e race conditions ([6245e6d](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/6245e6d265d6a086d3aa6813df3c1cd71fa7303d))
* **presence:** add DynamicApiPresenceModule with pluggable adapters ([5957c54](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/5957c54b62664f5861123468f50068861aff7b78))
* **presence:** break circular dependency by moving presence out of modules barrel ([51fad6a](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/51fad6a7fe8b7dd3472bbd27fd25ff6f70a80267))
* **presence:** replace String(err) with JSON.stringify in gateway error handler ([8dcaa04](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/8dcaa04499ef0dbacb988b9a0acddbf463ac68be))

## [4.8.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.7.0...v4.8.0) (2026-05-24)

### cascade

* **cascade:** add cascade delete and beforeDeleteCallback hook ([d4f3122](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/d4f312268114c901a36467ad6a8f9348e3d11f95))

### callbacks

* **callbacks:** add rawUpdateOneDocument and rawUpdateManyDocuments to CallbackMethods ([c0b3dfa](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/c0b3dfab500b983e506daaed7680b806e1ed64c8))

### get-many,aggregate

* **get-many,aggregate:** add predicateBehavior 'filter' option ([0d5d478](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/0d5d478fb4227a658d908ec967c9ba23cb8da235))

## [4.7.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.6.1...v4.7.0) (2026-05-24)

### interfaces

* **interfaces:** add DynamicApiRequest typed interface ([a7e6558](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/a7e65582f5f83fd1bf499a94941340111a097470))

### decorators

* **decorators:** add @DerivedField and @ProtectedField decorators ([d01b52a](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/d01b52a588ba138b38b708c52e7c660b8c53d897))
* **decorators:** fix @DerivedField on update and @ProtectedField runtime strip ([4eaf187](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/4eaf187404cd60953a9cc5895bb3063eec308679))

### auth

* **auth:** implement refreshTokenOnUpdate and operation context ([3044a50](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/3044a50fdbbeb018d7469ebf5221f5eae3637191))
* **auth:** remove unnecessary type assertions flagged by SonarQube ([dad0a7a](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/dad0a7ae70ecd8384a900a61fb8cc59530b2855b))

### dynamic-api-config

* **dynamic-api-config:** add missing refreshTokenOnUpdate field in spec config ([0e3c41b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/0e3c41bbf2a3f05b9c8e6bf761c88ee22d7869e9))

### agent

* **agent:** install caveman skills and project documentation ([533db4d](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/533db4dfe902334abf12d1e8590ff6a2978a32d9))

## [4.6.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.6.0...v4.6.1) (2026-03-27)

## [4.6.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.5.0...v4.6.0) (2026-03-26)


### interfaces

* **interfaces:** add User generic type parameter to callback interfaces ([532302d](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/532302d88ddbe9fe19f7237b5298be3098b54af6))


### routes

* **routes:** propagate authenticated user to service callbacks ([b7454e5](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/b7454e58f3adc8467e6727eef59e90b89a0e1fe9))

## [4.5.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.4.0...v4.5.0) (2026-03-18)


### helpers

* **helpers:** add native lodash replacement helper with tests ([2964ad2](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/2964ad2b88ae990fcbf48851168c28ac69ddf9b7))

## [4.4.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.3.0...v4.4.0) (2026-03-18)


* pass existing entities to BeforeSaveListCallback in DuplicateMany and UpdateMany ([77b6872](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/77b6872e6852eb3199bae0f313f6ef20f101d815))
* update BeforeSaveListCallback to receive entities list and add AnyBeforeSaveCallback union type ([8b422b2](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/8b422b2821a660d6ce1dde01bfe470d6e3ce5275))


### interfaces

* **interfaces:** add BeforeSaveDeleteManyCallback type for delete-many route ([ce1d707](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/ce1d7076b23c63de74e4b6e7ae44044e63d917a8))
* **interfaces:** add short aliases for callback types and deprecate verbose names ([aa6467f](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/aa6467f839a753770e40ebeaf0c742b11b67e3da))


### routes

* **routes:** pass beforeSaveCallback from routeConfig to service providers ([3d4ee6d](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/3d4ee6dd0103c9f9b797dc616da516f949e61eae))

## [4.3.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.2.1...v4.3.0) (2026-03-17)


### cache

* **cache:** add auto-generated cache purge endpoint per feature ([9504506](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/95045067862a25a4f6dbb1b7331b5c53d231235d))
* **cache:** add DisableCache decorator and metadata key ([cf2b074](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/cf2b074de08e7c652c5a8ace789029126f1fada9))
* **cache:** add disableCache option to controller and route interfaces ([935279b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/935279bc40039e509c711ca13c2c45a72989f4b8))
* **cache:** apply disableCache metadata on read route controller mixins ([948ea95](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/948ea9510ee3cc00a5b9e2750cb5b075130fb128))
* **cache:** bypass cache directly in intercept() for non-cacheable requests ([d822e49](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/d822e499a64e69748cf6cc39047ecb86a43cea74))
* **cache:** check disableCache metadata and auto-purge on write operations ([2cb3e14](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/2cb3e14e5feb04274ede45f8cd3790a17aafa9ab))
* **cache:** exclude auth routes from cache regardless of global prefix or versioning ([062810c](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/062810cc1f9a4e77248daf29b78415ea8524121a))
* **cache:** resolve disableCache in getMixinData with route > controller priority ([2bf58a1](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/2bf58a17c3a13fc5a560579195eba15f3a04f3f5))

## [4.2.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.2.0...v4.2.1) (2026-03-17)


* exclude all /auth routes from global HTTP cache when auth is enabled ([bb55a93](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/bb55a93ab7b8faadf56d5591dfdb9df06d595ac4))

## [4.2.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.1.2...v4.2.0) (2026-03-17)


### socket-adapter

* **socket-adapter:** safely access error properties with instanceof check ([c243d2b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/c243d2b9af0cfc3449a796b708d7bc0bb4e8d7e1))


### auth

* **auth:** add login alias for the login field ([b15c0a0](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/b15c0a055a9673139d8e94447df9587fbedf3f1e))
* **auth:** decode JWT from Authorization header instead of relying on req.user ([e648aed](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/e648aed05575a1b6271388cf8ed91e37e61c4bb0))


### websockets

* **websockets:** add options object, onConnection hook and debug mode to enableDynamicAPIWebSockets ([d643ca6](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/d643ca640be54997cf61a0cc1faa74e73cd73ab5))


### ws-guards

* **ws-guards:** support auth.token in WebSocket guards ([12168a9](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/12168a950ea3040e3e359c5589604b6aceaae250))

## [4.1.2](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.1.1...v4.1.2) (2026-03-16)


### auth

* **auth:** bypass passport-local missing credentials check when customValidate is defined ([6274c6d](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/6274c6d0f3a8251289582dbd59f42d78c34408ac))

## [4.1.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.1.0...v4.1.1) (2026-03-16)


### auth

* **auth:** remove shadowing Entity generic from customValidate and LocalStrategy ([b077101](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/b077101839ed16b3d29b0c56f1e2aae007f233c9))

## [4.1.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v4.0.0...v4.1.0) (2026-03-15)


### gateway

* **gateway:** add room-targeted broadcast support with logger + fix e2e test event names ([69e7bfd](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/69e7bfd35c37d2e4426534df6b37551bcbcce732))
* **gateway:** replace Promise.all with forEach for socket.join/leave (non-Promise return) ([6923e00](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/6923e0080f4c8e91bd5fd9bebb8f2001616ff061))


### auth

* **auth:** add @Public() to refresh-token and logout endpoints to bypass global JWT auth guard ([028c3a1](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/028c3a156ec8ec5a1c225c175a66ee9e6910794a))
* **auth:** add login.customValidate and login.useStrategy options to local strategy ([267ad91](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/267ad91f96e56be4da66844612ac85221658e435))
* **auth:** register DynamicApiJwtAuthGuard as APP_GUARD in forRoot() instead of forFeature() ([cfe5dfc](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/cfe5dfcf6c4bfd9cdb6121a7202cbc01b60e98d0))

## [4.0.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v3.2.1...v4.0.0) (2026-03-14)


### ⚠ BREAKING CHANGES

* **auth:** add refreshSecret, refreshTokenField, useCookie options and extend global state with jwtRefreshSecret, jwtRefreshUseCookie

* resolve SonarQube code smells - replace String() with JSON.stringify() for proper object serialization - remove unnecessary type assertions on jwtService.decode() - extract nested ternary operations into if/else blocks ([c908ad2](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/c908ad2b6b0d6871acb9f5d4d0ac5fa9ad3812d2))


### types

* **types:** eliminate any in base service - use typed lean<T>(), PipelineStage and unknown error handling ([db7f6e5](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/db7f6e5277a6e49ccae62065b9443568a1ff3434))
* **types:** improve type safety in auth module controller interface, mixins and service spec ([12a41a0](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/12a41a0e6b96bf9b464d03a1c3807bb78f387040))
* **types:** replace any with typed params in builders, decorators, helpers, interceptors and interfaces ([ec6802e](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/ec6802e8196e99876c5e9e8f5ebbf6cc92d5e9bf))
* **types:** replace any with unknown in socket adapter and JWT guards/strategies ([4acfcb2](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/4acfcb2bab2ac3f9823d76c61783bc9c046dcc15))
* **types:** use typed lean<T>() queries and replace error: any with error: unknown in all route services ([52a5dc8](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/52a5dc8c14b9a25ef037c55a37cc851656e9d98f))


### auth/strategy

* **auth/strategy:** extract jwtFromRequest cookie logic to static method for testability ([5149916](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/5149916a8dcc68c9ca8adf69c14b5b06f3f911e8))


### auth/service

* **auth/service:** replace crypto with node:crypto protocol (sonar typescript:S7772) ([4a9d535](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/4a9d535291346304576743e9e749c95f99b0bde4))


### auth/module

* **auth/module:** update createAuthController and createAuthGateway calls to new options object signatures ([a148d3f](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/a148d3fd641c8e547cd5972dae306b9204ebc8ba))


### auth

* **auth:** add broadcast support for auth actions (login, register, getAccount, updateAccount) ([5e4583e](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/5e4583e9bad607e07cf9a91e631f2945063e00b0))
* **auth:** add JwtRefreshStrategy (Bearer/cookie extractor), JwtRefreshGuard and JwtSocketRefreshGuard ([fa11ebf](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/fa11ebf15445502491ab7650457645da64aa87bf))
* **auth:** add POST /auth/refresh-token and POST /auth/logout to controller and gateway mixins ([4fbc572](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/4fbc572a63887cc7b4d1324402e8e0a7d3036759))
* **auth:** add refreshSecret, refreshTokenField, useCookie options and extend global state with jwtRefreshSecret, jwtRefreshUseCookie ([1e00969](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/1e00969d9f0c783bdfd8a82c4c7c93a27cc7a72f))
* **auth:** implement refresh token flow in BaseAuthService ([1e08538](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/1e08538a2aa6960527c072b3a5374dc7daeda371))
* **auth:** reduce createAuthController and createAuthGateway to 3 params (sonar max-params) ([1c47791](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/1c47791d8267804de4f0a9c8d44d6d726124110d))
* **auth:** wire refresh token options through AuthModule, auth helper and DynamicApiModule ([5621d82](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/5621d8215fcbaffb3232d6106c55ac8354fe2eca))


### deps

* **deps:** add cookie-parser and @types/cookie-parser dependencies ([1878546](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/1878546535ab271be733f2cf93b7574b0cd20c56))


### ci

* **ci:** fix merged Sonar XML report format for SonarScanner ([5ec4e67](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/5ec4e675dfea8fc7cc7f14f21e656f761308f533))

## [3.2.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v3.2.0...v3.2.1) (2026-03-14)


* resolve TypeScript breaking changes from dependency upgrades ([a836768](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/a836768e4fc0609898ec3917aecbf677b1b74935))

## [3.2.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v3.1.0...v3.2.0) (2026-03-14)


### gateways

* **gateways:** add DynamicApiBroadcastGateway factory to capture ws server ([24d0e74](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/24d0e748a973b6c0a5808225448c931417eac550))
* **gateways:** remove private modifier from server and broadcastService in DynamicApiBroadcastGateway ([cc9aed6](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/cc9aed6e0b95a2f82ff6d6eac10d6d211e119249))


### broadcast

* **broadcast:** use static wsServer in DynamicApiBroadcastService to share across DI scopes, separate broadcastService provider from gateway in write modules ([d7ded07](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/d7ded072c35ed9d2680440da53143bb627936747))


### helpers

* **helpers:** always resolve event name in getMixinData for HTTP broadcast support ([8ddca98](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/8ddca9855fe3ca8fea68ed5ef19665a07e42ad62))


### services

* **services:** add DynamicApiBroadcastService for HTTP broadcast support ([f8a4bca](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/f8a4bca30b9d422407c4c7fbec22df32caeb9725))


### routes

* **routes:** declare hasBroadcast in write modules and remove from read-only modules ([543907d](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/543907d2c9178ced1eb138ad3b3b154e1134a1e7))
* **routes:** inject optional broadcastService in 9 write-route controller mixins and helpers ([43af94a](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/43af94a4cd5b08d200732bfa97fd5357d7200531))


### interfaces

* **interfaces:** add broadcastGatewayOptions to forRoot options and global state ([e24dba1](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/e24dba1980f2b37ead56c0ff19f2e959e1911a27))


### auth

* **auth:** add DynamicApiGetAccountOptions type with callback and useInterceptors ([dc7f072](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/dc7f07215e58ffc433dc27f93b7f4f99b4ef0dd4))
* **auth:** add useInterceptors support to getAccount on controller and gateway ([461fc4d](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/461fc4d678a42d5568035b166a41c065df2d5525))
* **auth:** wire getAccount callback through service, module and helper ([c769e15](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/c769e1559f7b7542723c0b35caf2198143d63b0a))

## [3.1.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v3.0.1...v3.1.0) (2026-03-08)


### websocket

* **websocket:** add broadcast configuration interface ([78a0518](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/78a0518b23d9be3f3025d8aa190abcecad211283))
* **websocket:** implement broadcast functionality in base gateway ([fd77ec7](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/fd77ec7e4ee9bfa08fec81b6f81f2a51e8b20bee))
* **websocket:** integrate broadcast in CRUD gateways ([237a281](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/237a2812e36adf89b4cd3dafc0795957bac778b6))
* **websocket:** integrate broadcast in delete and duplicate gateways ([c3cdbf8](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/c3cdbf85f462f40b7a9fc59412317bb8349346b7))

## [3.0.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v3.0.0...v3.0.1) (2026-02-21)

## [3.0.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.14.2...v3.0.0) (2026-02-19)

## [2.14.2](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.14.1...v2.14.2) (2025-11-23)

## [2.14.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.14.0...v2.14.1) (2025-11-11)

## [2.14.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.13.0...v2.14.0) (2025-10-23)


### authentication

* **authentication:** add the possibility to set extras imports/providers/controllers ([2fe2bb2](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/2fe2bb2c8ae59acb418ca68775fbe4e3cb398df3))

## [2.13.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.12.0...v2.13.0) (2025-10-21)


### authentication

* **authentication:** add the possibility to use method interceptors ([00797af](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/00797af79fdae84bac665cfe9cd81c316fbf6d55))


### aggregate

* **aggregate:** add the possibility to use class/method interceptors ([c0aadf7](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/c0aadf734f4daf43180550663fddb360cc4642b9))

## [2.12.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.11.0...v2.12.0) (2025-10-19)


### interceptors

* **interceptors:** add the possibility to use class/method interceptors ([977f3de](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/977f3deccabaf4d5a87f76eca5c9012ab05c3d48))

## [2.11.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.10.1...v2.11.0) (2025-07-27)


### socket

* **socket:** add policies guard mixin ([bc739b4](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/bc739b4b8ea5e026fc93a5c70e1dfae454323c4f))

## [2.10.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.10.0...v2.10.1) (2025-07-19)

## [2.10.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.9.0...v2.10.0) (2025-02-22)


### helper

* **helper:** get repository from entity method ([e02c9b8a](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/e02c9b8a3476958c261b862971db9b3cbb5a5a9c))


### auth

* **auth:** add before save callback, improve some behaviors ([20df58a3](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/20df58a35b0ca00376c06e0f4e850e2fd5e81a99))

## [2.9.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.8.3...v2.9.0) (2025-02-16)


### api

* **api:** add aggregate route ([e4b1a7ba](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/e4b1a7ba61819bf20f531b619a5f46ce753dcb0b))
* **api:** add before save callback ([f5ba7b5a](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/f5ba7b5aed41804ef39894b3d333300c65f95e8b))


### swagger

* **swagger:** add the possibility to write json file to another path ([a41356e8](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/a41356e81da07d7abd5c8eec46855b38ba2aea44))

## [2.8.3](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.8.2...v2.8.3) (2024-09-07)

## [2.8.2](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.8.1...v2.8.2) (2024-09-01)

## [2.8.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.8.0...v2.8.1) (2024-09-01)


### api

* **api:** handle aggregate route default description ([58b7d5b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/58b7d5b1e4a4fca3f8da52fbb6fe8563eba82f16))

## [2.8.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.7.1...v2.8.0) (2024-09-01)


### api

* **api:** add aggregate route ([9d47e3b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/9d47e3bf6182047aa7dc0a1fd1209513122c83e6))

## [2.7.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.7.0...v2.7.1) (2024-08-30)

## [2.7.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.6.0...v2.7.0) (2024-08-29)


### api

* **api:** add mapping from / to entity, update related ([2af5ad3](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/2af5ad373e83b9161bf4ac8f3b4a910aa3801aef))

## [2.6.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.5.1...v2.6.0) (2024-08-24)


### api

* **api:** handle route with sub path ([1b57ff0](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/1b57ff09a3ad8e524a50de466d0bfa6b34bcfe9b))

## [2.5.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.5.0...v2.5.1) (2024-08-20)

## [2.5.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.4.5...v2.5.0) (2024-08-20)


### web-socket

* **web-socket:** add the possibility to customize event names ([64020d2](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/64020d29c3b3ce96e172db9253b22c812d0deb4e))

## [2.4.5](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.4.4...v2.4.5) (2024-08-16)

## [2.4.4](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.4.3...v2.4.4) (2024-08-14)

## [2.4.3](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.4.2...v2.4.3) (2024-08-13)

## [2.4.2](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.4.1...v2.4.2) (2024-08-11)

## [2.4.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.4.0...v2.4.1) (2024-08-11)

## [2.4.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.17...v2.4.0) (2024-08-11)


### web-socket

* **web-socket:** add all modules configuration ([bf51c9a](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/bf51c9ae0037c285ad251250f9dbb3cd29e42dec))

## [2.3.17](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.16...v2.3.17) (2024-05-26)


### authentication

* **authentication:** rework reset and change password behaviors when options are provided ([3a0f09d](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/3a0f09dd23f0083c79632bed9a83e93eb90c62d2))

## [2.3.16](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.15...v2.3.16) (2024-05-25)


### authentication

* **authentication:** rework login behaviors when options are provided ([4140254](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/414025478afbc64395d31f345ec1f7162d071b21))

## [2.3.15](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.14...v2.3.15) (2024-05-23)


### authentication

* **authentication:** rework register behaviors when options are provided ([52dc16b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/52dc16b45075517e7dea4629d00f4b5e386f7a60))

## [2.3.14](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.12...v2.3.14) (2024-05-21)

## [2.3.13](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.12...v2.3.13) (2024-05-21)

## [2.3.12](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.11...v2.3.12) (2024-05-18)

## [2.3.11](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.10...v2.3.11) (2024-05-12)

## [2.3.10](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.9...v2.3.10) (2024-05-11)

## [2.3.9](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.8...v2.3.9) (2024-05-09)

## [2.3.8](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.7...v2.3.8) (2024-05-08)

## [2.3.7](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.6...v2.3.7) (2024-05-08)

## [2.3.6](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.5...v2.3.6) (2024-05-08)

## [2.3.5](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.3...v2.3.5) (2024-05-08)

## [2.3.4](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.2...v2.3.4) (2024-05-08)

## [2.3.3](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.2...v2.3.3) (2024-05-07)

## [2.3.2](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.1...v2.3.2) (2024-05-07)

## [2.3.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.3.0...v2.3.1) (2024-05-05)

## [2.3.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.2.1...v2.3.0) (2024-05-02)


### api

* **api:** add reset password process with callbacks ([9e8bf56](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/9e8bf562ee9717ea1c0fe387bb621e9f724955ac))

## [2.2.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.2.0...v2.2.1) (2024-04-30)

## [2.2.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.1.10...v2.2.0) (2024-04-30)


### api

* **api:** add routes service callback ([bb233fe](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/bb233fe79565863fe2191b224176accaf1725907))
* **api:** add the possibility to configure default or excluded routes ([ef501df](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/ef501df7c453352b16056fc2766f3bf2cbefb532))


### auth

* **auth:** add service callbacks ([d93ad01](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/d93ad01589099c92757922dc3e9320332c563e82))


### validation

* **validation:** add custom pipe and update default auth to avoid request errors if not configured ([f75fca7](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/f75fca7cdb1bfc5d0fcd72ea1acf75179b22d69c))

## [2.1.10](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.1.9...v2.1.10) (2024-04-29)

## [2.1.9](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.1.8...v2.1.9) (2024-04-01)

## [2.1.8](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.1.7...v2.1.8) (2024-04-01)

## [2.1.7](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.1.6...v2.1.7) (2024-04-01)

## [2.1.6](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.1.5...v2.1.6) (2024-03-31)

## [2.1.5](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.1.4...v2.1.5) (2024-03-29)

## [2.1.4](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.1.3...v2.1.4) (2024-03-29)

## [2.1.3](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.1.2...v2.1.3) (2024-03-29)

## [2.1.2](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.1.1...v2.1.2) (2024-03-26)


* rename all custom dto to avoid swagger conflicts ([0bc7e5f](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/0bc7e5fe85f3c44ce3382839e5a502d3232e5526))

## [2.1.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.1.0...v2.1.1) (2024-03-21)

## [2.1.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v2.0.0...v2.1.0) (2024-03-20)


### schema

* **schema:** add the possibility to customize initialization ([7fd541b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/7fd541b055bb0baa60409651a54d42244d8f3042))

## [2.0.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v1.4.3...v2.0.0) (2024-03-18)


### ⚠ BREAKING CHANGES

* **schema-options:** bind event type to route type to improve understanding
* **authentication:** rework options

### schema-options

* **schema-options:** bind event type to route type to improve understanding ([8a6a391](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/8a6a391c19a68697998ed6508d88ed63c1fbde7d))


### authentication

* **authentication:** rework options ([e833898](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/e833898903279e1e1e220b065724e013b1729029))

## [1.4.3](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v1.4.2...v1.4.3) (2024-03-15)

## [1.4.2](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v1.4.1...v1.4.2) (2024-03-15)

## [1.4.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v1.4.0...v1.4.1) (2024-03-12)

## [1.4.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v1.3.3...v1.4.0) (2024-03-11)


### authentication

* **authentication:** add register ability predicate ([811b085](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/811b0853ed836ce33a7a56312c3e045b5f73f5ee))


### api

* **api:** add authentication ([a692b7b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/a692b7b0fcd774dc5152b9f82ed22107c543110a))
* **api:** add casl ability to control route access ([6202a24](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/6202a247d301a7a72ce47f596a288d66724999f1))

## [1.3.3](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v1.3.2...v1.3.3) (2024-03-06)


### api

* **api:** display the package version in swagger by default ([36520c3](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/36520c37abdd4fcbbfeed333a68ea0a108533b39))

## [1.3.2](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v1.3.1...v1.3.2) (2024-03-05)

## [1.3.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v1.3.0...v1.3.1) (2024-03-05)

## [1.3.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v1.2.1...v1.3.0) (2024-03-04)


### api

* **api:** add delete many route ([43a89cb](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/43a89cb4c087c468743559950fa232ff6e10c140))
* **api:** add duplicate many route ([be33d1b](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/be33d1b221d81c5ff6649cd2eccc331cb58459b9))
* **api:** add update many route ([7543eb9](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/7543eb92d7ba538f6d46b69ec194a6c44daff5b2))

## [1.2.1](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v1.2.0...v1.2.1) (2024-03-04)


## [1.2.0](https://github.com/MikeDev75015/mongodb-dynamic-api/compare/v1.1.0...v1.2.0) (2024-03-03)


### api

* **api:** add default route description if not specified ([733b42a](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/733b42a6dab49c39370fdd4094b7f08288e54c5b))

## 1.1.0 (2024-03-03)


### api

* **api:** add the possibility to enable the api uri versioning ([0f52917](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/0f529174ea583078bb136d2db484ef64b6aa6e49))
* **api:** correct CreateMany response type and body ([804b7d5](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/804b7d55fe2b8b515436b41fa338be75c5e030e2))
* **api:** make routes optional, add all routes automatically if not configured ([f17e2eb](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/f17e2ebdbbde8f05a5c80c404ffc1febf460bc20))
* **api:** set duplicate one body optional ([f24b2b9](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/f24b2b964e251fbb92acfc14222386fec3239dcb))
* **api:** add create-many module ([9ae72d5](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/9ae72d5dd7bda27423f96dd642d41eff31e75370))


### swagger

* **swagger:** add enable method ([5f3f865](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/5f3f8656dc186e833d5c4792efacf9f0a2005afd))


## 1.0.0 (2024-02-27)


### Features

* add mongodb dynamic api files ([33dfc14](https://github.com/MikeDev75015/mongodb-dynamic-api/commit/33dfc143d34e31c802a5d1adb5e8d99ad5aadc6f))
