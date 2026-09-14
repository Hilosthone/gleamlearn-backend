// src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() Decorator
 * 
 * WHY IT IS NEEDED:
 * It abstracts away the raw Express `request.user` object extraction. 
 * Instead of writing `req.user` in every controller method, you can 
 * use `@CurrentUser() user` or `@CurrentUser('id') userId: string`.
 * 
 * HOW TO USE IT:
 * Place it as a parameter in any protected controller route method:
 * `async findAll(@CurrentUser('id') userId: string)`
 */
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property like 'id' or 'email' is requested, return just that property
    return data ? user?.[data] : user;
  },
);