import { GUARDS_METADATA } from '@nestjs/common/constants';
import { QuestionsController } from './questions.controller.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt.guard.js';

const guards = (method: keyof QuestionsController) => [
  ...((Reflect.getMetadata(GUARDS_METADATA, QuestionsController) as unknown[]) ?? []),
  ...((Reflect.getMetadata(GUARDS_METADATA, QuestionsController.prototype[method]) as unknown[]) ?? []),
];

describe('question bank authorization', () => {
  it('learners can read; only admins can create, edit or delete shared questions', () => {
    for (const m of ['findAll', 'findOne'] as const) expect(guards(m)).toEqual([JwtAuthGuard]);
    for (const m of ['create', 'update', 'remove'] as const) expect(guards(m)).toEqual([AdminJwtAuthGuard]); // no learner guard
  });
});
