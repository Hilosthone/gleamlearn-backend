// src/auth/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard
 * 
 * WHY IT IS NEEDED:
 * This guard acts as a security checkpoint for your routes. It intercepts incoming 
 * HTTP requests, looks for the `Authorization: Bearer <token>` header, verifies 
 * the cryptographic signature of the JWT using your secret/public key, and attaches 
 * the decoded user payload to `request.user`.
 * 
 * HOW IT WORKS:
 * Extending NestJS's built-in `AuthGuard('jwt')` delegates validation to your 
 * configured Passport JWT strategy. If the token is missing or invalid, it 
 * automatically blocks the request with a 401 Unauthorized response.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}