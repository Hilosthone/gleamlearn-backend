import { stripProtectedFields } from '../utils/strip-protected.js';
import { NotesService } from '../../notes/notes.service.js';
import { ExamPrepService } from '../../exam-prep/exam-prep.service.js';
import { PersonalAiCompanionService } from '../../personal-ai-companion/personal-ai-companion.service.js';

const ME = 'user-me';
const VICTIM = 'user-victim';

/** In-memory repository: rows are only matched when every where-field matches. */
function memoryRepo(rows: any[]) {
  const matches = (row: any, where: any) => Object.entries(where).every(([k, v]) => row[k] === v);
  return {
    rows,
    find: vi.fn(async ({ where }: any = {}) => rows.filter((r) => !where || matches(r, where))),
    findOne: vi.fn(async ({ where }: any) => rows.find((r) => matches(r, where)) ?? null),
    create: vi.fn((data: any) => ({ ...data })),
    save: vi.fn(async (entity: any) => {
      const i = rows.findIndex((r) => r.id === entity.id);
      if (i >= 0) rows[i] = { ...rows[i], ...entity };
      else rows.push({ id: entity.id ?? `new-${rows.length}`, ...entity });
      return entity;
    }),
    update: vi.fn(async (where: any, changes: any) => {
      for (const r of rows.filter((row) => matches(row, typeof where === 'string' ? { id: where } : where))) Object.assign(r, changes);
      return { affected: 1 };
    }),
    remove: vi.fn(async (entity: any) => rows.splice(rows.findIndex((r) => r.id === entity.id), 1)),
  };
}

function withRepo<T>(proto: any, field: string, repo: unknown): T {
  const service = Object.create(proto);
  service[field] = repo;
  return service as T;
}

describe('stripProtectedFields', () => {
  it('drops id, userId and other ownership/audit fields; keeps the rest', () => {
    expect(stripProtectedFields({ id: 'x', userId: 'y', ownerId: 'z', createdBy: 'c', createdAt: 1, updatedAt: 2, deletedAt: 3, title: 'T', content: 'C' }))
      .toEqual({ title: 'T', content: 'C' });
    expect(stripProtectedFields(null)).toEqual({});
  });
});

describe("a learner cannot touch another user's records through the request body", () => {
  it("notes: `id` in an update body does not redirect the save to the victim's note", async () => {
    const repo = memoryRepo([
      { id: 'n-me', userId: ME, title: 'mine', content: 'a' },
      { id: 'n-victim', userId: VICTIM, title: 'theirs', content: 'secret' },
    ]);
    const notes = withRepo<NotesService>(NotesService.prototype, 'noteRepo', repo);
    await notes.update('n-me', ME, { id: 'n-victim', userId: ME, title: 'hijack' } as any);
    expect(repo.rows.find((r) => r.id === 'n-victim')).toMatchObject({ userId: VICTIM, title: 'theirs', content: 'secret' });
    expect(repo.rows.find((r) => r.id === 'n-me')).toMatchObject({ userId: ME, title: 'hijack' });
  });

  it('notes: `userId` in a create body is ignored (the note belongs to the caller)', async () => {
    const repo = memoryRepo([]);
    const notes = withRepo<NotesService>(NotesService.prototype, 'noteRepo', repo);
    await notes.create(ME, { title: 'x', content: 'y', userId: VICTIM } as any);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: ME }));
  });

  it('AI companion: `userId` in the body cannot create a companion for another account', async () => {
    const repo = memoryRepo([]);
    const svc = withRepo<PersonalAiCompanionService>(PersonalAiCompanionService.prototype, 'companionRepo', repo);
    await svc.createCompanion(ME, { name: 'Gleam', userId: VICTIM } as any);
    expect(repo.rows[0]).toMatchObject({ userId: ME, name: 'Gleam' });
  });
});

describe('exam prep plans are owner-scoped (previously listed, read, edited and deleted across users)', () => {
  const build = () => {
    const repo = memoryRepo([
      { id: 'p-me', userId: ME, examinationId: 'WAEC', targetSubject: 'Maths', studyPlan: { title: 'mine' } },
      { id: 'p-victim', userId: VICTIM, examinationId: 'JAMB', targetSubject: 'Physics', studyPlan: { title: 'theirs' } },
    ]);
    return { repo, svc: withRepo<ExamPrepService>(ExamPrepService.prototype, 'examPrepRepo', repo) };
  };

  it('list returns only the caller’s plans', async () => {
    const { svc } = build();
    expect((await svc.findAllPrepPlans(ME)).map((p) => p.id)).toEqual(['p-me']);
  });

  it("another user's plan → 404 for get, update and delete; nothing changes", async () => {
    const { svc, repo } = build();
    await expect(svc.findPrepPlanById('p-victim', ME)).rejects.toThrow(/not found/);
    await expect(svc.updatePrepPlan('p-victim', ME, { title: 'hijack' })).rejects.toThrow(/not found/);
    await expect(svc.deletePrepPlan('p-victim', ME)).rejects.toThrow(/not found/);
    expect(repo.rows.find((r) => r.id === 'p-victim')).toMatchObject({ userId: VICTIM, studyPlan: { title: 'theirs' } });
  });

  it('create stores the owner and maps the DTO onto the existing columns', async () => {
    const { svc, repo } = build();
    await svc.createPrepPlan(ME, { title: 'Finals', examType: 'WAEC', subjects: ['Maths', 'Physics'], targetDate: '2027-06-01', notes: 'n' });
    expect(repo.create).toHaveBeenCalledWith({
      userId: ME,
      examinationId: 'WAEC',
      targetSubject: 'Maths, Physics',
      targetExamDate: new Date('2027-06-01'),
      studyPlan: { title: 'Finals', examType: 'WAEC', subjects: ['Maths', 'Physics'], notes: 'n' },
    });
  });
});
