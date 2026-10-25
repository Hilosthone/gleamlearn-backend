import { SearchService, likePattern } from './search.service.js';
import { User } from '../auth/entities/user.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { Topic } from '../courses/entities/topic.entity.js';
import { Question } from '../questions/entities/question.entity.js';
import { NoteEntity } from '../notes/entities/note.entity.js';
import { fakeQueryBuilder } from '../../test/support/fake-query-builder.js';

const active = { exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' };

function build(results: Map<unknown, unknown[]> = new Map(), statusById: Record<string, Partial<typeof active>> = {}) {
  const built: any[] = [];
  const dataSource = {
    getRepository: vi.fn((entity: unknown) => ({
      createQueryBuilder: (alias: string) => {
        const qb = fakeQueryBuilder(alias, { many: results.get(entity) ?? [] });
        built.push({ entity, qb });
        return qb;
      },
    })),
  };
  const accountStatus = { getStatus: vi.fn(async (id: string) => ({ ...active, ...statusById[id] })) };
  const service = new SearchService(dataSource as never, accountStatus as never);
  const queryFor = (entity: unknown) => built.find((b) => b.entity === entity)?.qb.query;
  return { service, queryFor, dataSource };
}

describe('likePattern', () => {
  it('wraps in % and matches %, _ and \\ literally', () => {
    expect(likePattern('  algebra ')).toBe('%algebra%');
    expect(likePattern('100%_\\')).toBe('%100\\%\\_\\\\%');
  });
});

describe('SearchService (TypeORM; no Prisma models)', () => {
  it('global search returns every category instead of failing with 500', async () => {
    const { service } = build(new Map([[Course, [{ id: 'c1', title: 'Algebra' }]]]));
    const res = await service.searchAll('alg', 'u1');
    expect(res).toEqual({
      query: 'alg',
      userId: 'u1',
      results: { courses: [{ id: 'c1', title: 'Algebra' }], topics: [], questions: [], materials: [], users: [] },
    });
  });

  it('course search matches title or description, case-insensitively, with an escaped parameter', async () => {
    const { service, queryFor } = build();
    await service.searchCourses('50%');
    const q = queryFor(Course);
    expect(q.where.join(' ')).toMatch(/ILIKE :p ESCAPE/);
    expect(q.where.join(' ')).toMatch(/c\.title.*c\.description/);
    expect(q.params.p).toBe('%50\\%%');
    expect(q.take).toBe(10);
  });

  it('topic search uses the topics table', async () => {
    const { service, queryFor } = build();
    await service.searchTopics('cells');
    expect(queryFor(Topic).where.join(' ')).toMatch(/t\.title ILIKE/);
  });

  it('question search never selects the answer or the explanation', async () => {
    const { service, queryFor } = build();
    await service.searchQuestions('photosynthesis');
    const select = queryFor(Question).select;
    expect(select).toContain('q.questionText');
    expect(select).not.toContain('q.correctAnswer');
    expect(select).not.toContain('q.explanation');
  });

  it("material search only covers the learner's own notes", async () => {
    const { service, queryFor, dataSource } = build();
    await expect(service.searchMaterials('mitosis')).resolves.toEqual([]);
    expect(dataSource.getRepository).not.toHaveBeenCalled();
    await service.searchMaterials('mitosis', 'u1');
    const q = queryFor(NoteEntity);
    expect(q.where[0]).toBe('n.userId = :userId');
    expect(q.params.userId).toBe('u1');
  });

  it('user search returns no email and hides deleted or frozen accounts', async () => {
    const rows = [
      { id: 'a', fullName: 'Ada', username: 'ada', email: 'ada@example.com' },
      { id: 'd', fullName: 'Deleted', username: 'del' },
      { id: 'f', fullName: 'Frozen', username: 'frz' },
    ];
    const { service, queryFor } = build(new Map([[User, rows]]), { d: { deleted: true }, f: { frozen: true } });
    const users = await service.searchUsers('a');
    expect(users).toEqual([{ id: 'a', fullName: 'Ada', username: 'ada' }]);
    expect(queryFor(User).select).toEqual(['u.id', 'u.fullName', 'u.username']);
  });
});
