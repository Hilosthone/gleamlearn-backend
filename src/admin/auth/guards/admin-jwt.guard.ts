// // src/admin/auth/guards/admin-jwt.guard.ts
// import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';

// @Injectable()
// export class AdminJwtAuthGuard extends AuthGuard('jwt') {
//   canActivate(context: ExecutionContext) {
//     return super.canActivate(context);
//   }

//   handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
//     if (err || !user) {
//       throw err || new UnauthorizedException('Admin authentication required');
//     }

//     // Ensure the token type is specifically 'admin'
//     if (user.type !== 'admin') {
//       throw new UnauthorizedException('Access denied. Admin token required.');
//     }

//     return user;
//   }
// }

// src/admin/auth/guards/admin-jwt.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt') { // <-- Using 'admin-jwt' strategy
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, admin: any, info: any, context: ExecutionContext) {
    if (err || !admin) {
      throw err || new UnauthorizedException('Admin authentication required');
    }

    // Ensure the token type is specifically 'admin'
    if (admin.type !== 'admin' && admin.role === undefined) {
      throw new UnauthorizedException('Access denied. Admin token required.');
    }

    return admin;
  }
}