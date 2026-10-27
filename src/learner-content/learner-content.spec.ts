import { BadRequestException, NotFoundException, NotImplementedException } from '@nestjs/common';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { detectFileType } from '../storage/file-signature.js';
import { StorageService } from '../storage/storage.service.js';
import { AvatarsService } from '../avatars/avatars.js';
import { MaterialsService, PersonalCoursesService } from './learner-content.js';
import { withTable } from '../common/errors/missing-table.js';
import { rankCourses, normaliseLevel, examsIn } from '../recommendations/course-ranking.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n');
const EXE = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);

function localStorage() {
  process.env.STORAGE_DRIVER = 'local';
  process.env.STORAGE_LOCAL_DIR = mkdtempSync(path.join(tmpdir(), 'gl-storage-'));
  process.env.JWT_SECRET = 'storage-test-secret';
  return new StorageService();
}

/** Minimal in-memory repository supporting the calls these services make. */
function memRepo<T extends Record<string, any>>(rows: T[] = []) {
  const match = (r: T, where: Record<string, unknown> = {}) =>
    Object.entries(where).every(([k, v]) => (v && typeof v === 'object' && '_value' in (v as object) ? ((v as any)._value as unknown[]).includes(r[k]) : r[k] === v));
  let n = 0;
  return {
    rows,
    create: (d: Partial<T>) => ({ ...d }) as T,
    save: async (d: T) => {
      const i = rows.findIndex((r) => (r.id && r.id === d.id) || (r.userId && !r.id && r.userId === d.userId));
      const row = { createdAt: new Date(), updatedAt: new Date(), ...(i >= 0 ? rows[i] : {}), ...d, ...(d.id || 'kind' in d ? {} : { id: `id-${++n}` }) } as T;
      if (i >= 0) rows[i] = row;
      else rows.push(row);
      return row;
    },
    findOne: async ({ where }: any) => rows.find((r) => match(r, where)) ?? null,
    find: async ({ where }: any = {}) => rows.filter((r) => match(r, where)),
    count: async ({ where }: any = {}) => rows.filter((r) => match(r, where)).length,
    delete: async (where: any) => {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i], where)) rows.splice(i, 1);
      return { affected: before - rows.length };
    },
    update: async (where: any, patch: any) => {
      rows.filter((r) => match(r, where)).forEach((r) => Object.assign(r, patch));
      return { affected: 1 };
    },
  };
}

describe('uploads are identified by their contents', () => {
  it('recognises the supported formats and rejects others, whatever the file is called', () => {
    expect(detectFileType(PNG)?.mime).toBe('image/png');
    expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.mime).toBe('image/jpeg');
    expect(detectFileType(PDF)?.mime).toBe('application/pdf');
    expect(detectFileType(Buffer.from('Photosynthesis notes\nLine two'))?.mime).toBe('text/plain');
    expect(detectFileType(EXE)).toBeNull();
    expect(detectFileType(Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]))).toBeNull(); // a zip that is not a .docx
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
  });
});

describe('local private storage', () => {
  it('stores bytes and serves them only with a valid, unexpired, untampered token', async () => {
    const s = localStorage();
    const key = await s.put('materials', PDF, 'pdf');
    const { url } = s.signedUrl(key, 60, 'application/pdf');
    const token = url.replace('/storage/local/', '');
    const found = s.verifyLocalToken(token)!;
    expect(readFileSync(found.filePath)).toEqual(PDF);
    expect(s.verifyLocalToken(token.slice(0, -2) + 'xx')).toBeNull(); // tampered signature
    const forged = Buffer.from(JSON.stringify({ k: 'local:../../etc/passwd', e: 9e9, m: 'text/plain' })).toString('base64url');
    expect(s.verifyLocalToken(`${forged}.abc`)).toBeNull();
    const expired = s.signedUrl(key, -10, 'application/pdf').url.replace('/storage/local/', '');
    expect(s.verifyLocalToken(expired)).toBeNull();
    await s.remove(key);
    expect(existsSync(found.filePath)).toBe(false);
  });
});

describe('avatars', () => {
  const make = () => {
    const storage = localStorage();
    const repo = memRepo<any>();
    return { service: new AvatarsService(repo as never, storage), repo, storage };
  };

  it('default, preset, upload, reset — each learner only ever touches their own row', async () => {
    const { service, repo } = make();
    expect(await service.get('u1')).toEqual({ kind: 'default' });
    expect(await service.choosePreset('u1', 'owl')).toEqual({ kind: 'preset', presetId: 'owl' });
    const up = await service.upload('u1', { buffer: PNG });
    expect(up.kind).toBe('upload');
    expect((up as any).imageUrl).toMatch(/^\/storage\/local\//);
    expect(await service.get('u2')).toEqual({ kind: 'default' }); // another learner is unaffected
    expect(repo.rows.filter((r: any) => r.userId === 'u1')).toHaveLength(1);
    expect(await service.reset('u1')).toEqual({ kind: 'default' });
    expect(repo.rows).toHaveLength(0);
  });

  it('rejects files that are not PNG/JPEG/WebP by content, and empty or oversized ones', async () => {
    const { service } = make();
    await expect(service.upload('u1', { buffer: EXE })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.upload('u1', { buffer: PDF })).rejects.toThrow('PNG, JPEG or WebP');
    await expect(service.upload('u1', undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.upload('u1', { buffer: Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]) })).rejects.toThrow('2 MB');
  });

  it('replacing an uploaded picture deletes the previous object', async () => {
    const { service, storage } = make();
    const removed = vi.spyOn(storage, 'remove');
    await service.upload('u1', { buffer: PNG });
    await service.choosePreset('u1', 'rocket');
    expect(removed).toHaveBeenCalledTimes(1);
  });
});

describe('personal courses and materials', () => {
  const make = () => {
    const storage = localStorage();
    const courses = memRepo<any>();
    const modules = memRepo<any>();
    const materials = memRepo<any>();
    const m = new MaterialsService(materials as never, courses as never, storage);
    vi.spyOn(m, 'countsByCourse').mockResolvedValue(new Map());
    return { courses: new PersonalCoursesService(courses as never, modules as never, m), materials: m, rows: { courses, modules, materials } };
  };

  it('a learner creates, organises and edits their own course; another learner gets 404 for it', async () => {
    const { courses } = make();
    const c = await courses.create('u1', { title: ' Biology revision ', subjects: ['Biology', ' biology ', ''], examGoals: ['WAEC'] });
    expect(c).toMatchObject({ userId: 'u1', title: 'Biology revision', subjects: ['Biology', 'biology'], examGoals: ['WAEC'] });
    const mod = await courses.addModule('u1', c.id, { title: 'Cells', notes: 'Cell wall vs membrane' });
    await courses.updateModule('u1', c.id, mod.id, { isCompleted: true });
    const listed = await courses.list('u1');
    expect(listed[0]).toMatchObject({ moduleCount: 1, completedModules: 1 });
    await expect(courses.get('u2', c.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(courses.update('u2', c.id, { title: 'mine now' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(courses.addModule('u2', c.id, { title: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(courses.updateModule('u2', c.id, mod.id, { title: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    expect(await courses.list('u2')).toEqual([]);
  });

  it('materials: content-checked upload, owner-only access/delete, attached only to the owner’s course', async () => {
    const { courses, materials } = make();
    const c = await courses.create('u1', { title: 'Chemistry' });
    const m = await materials.upload('u1', { buffer: PDF, originalname: 'notes.pdf' }, c.id);
    expect(m).toMatchObject({ originalName: 'notes.pdf', mimeType: 'application/pdf', status: 'READY', personalCourseId: c.id });
    expect(m).not.toHaveProperty('storageKey');
    await expect(materials.upload('u1', { buffer: EXE, originalname: 'notes.pdf' })).rejects.toThrow('PDF, Word');
    await expect(materials.upload('u2', { buffer: PDF, originalname: 'x.pdf' }, c.id)).rejects.toBeInstanceOf(NotFoundException);
    expect((await materials.access('u1', m.id)).url).toMatch(/^\/storage\/local\//);
    await expect(materials.access('u2', m.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(materials.remove('u2', m.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(await materials.list('u2')).toEqual([]);
    await materials.remove('u1', m.id);
    expect(await materials.list('u1')).toEqual([]);
  });

  it('AI generation from a locally stored file is reported as unavailable, never faked', async () => {
    const { materials } = make();
    const m = await materials.upload('u1', { buffer: PDF, originalname: 'a.pdf' });
    await expect(materials.generate('u1', m.id, 'summary')).rejects.toBeInstanceOf(NotImplementedException);
  });

  it('deleting a course keeps its materials in the library', async () => {
    const { courses, materials, rows } = make();
    const c = await courses.create('u1', { title: 'Physics' });
    await materials.upload('u1', { buffer: PDF, originalname: 'p.pdf' }, c.id);
    await courses.remove('u1', c.id);
    expect(rows.materials.rows[0].personalCourseId).toBeNull();
    expect(rows.courses.rows).toHaveLength(0);
  });
});

describe('a table that has not been created yet answers 501, not 500', () => {
  it('maps Postgres undefined_table to FEATURE_UNAVAILABLE', async () => {
    const missing = Object.assign(new Error('relation "user_avatars" does not exist'), { driverError: { code: '42P01' } });
    await expect(withTable('Profile pictures', () => Promise.reject(missing))).rejects.toBeInstanceOf(NotImplementedException);
    await expect(withTable('x', () => Promise.reject(new Error('other')))).rejects.toThrow('other');
  });
});

describe('course recommendations from the learner profile', () => {
  const course = (id: string, title: string, track: string, level: string | null, description = '', departmentName: string | null = null) => ({ id, title, description, track, level, departmentName });
  const catalogue = [
    course('c1', 'JAMB Biology crash course', 'Secondary', 'SS 3', 'Past questions for UTME'),
    course('c2', 'Chemistry for SS2', 'Secondary', 'SS 2'),
    course('c3', 'Data Structures', 'University', '200 Level', '', 'Computer Science'),
    course('c4', 'WAEC English', 'Secondary', 'SS 3', 'WASSCE preparation'),
  ];

  it('ranks by exam goal, class and track, with reasons that name the profile value; skips enrolled courses', () => {
    const r = rankCourses({ educationType: 'Secondary', secondaryClass: 'SSS3', examAimOrGoals: 'I want to pass JAMB and WAEC' }, catalogue, new Set(['c4']));
    expect(r.recommendations.map((x) => x.course.id)).toEqual(['c1', 'c2']);
    expect(r.recommendations[0].reasons).toEqual(['Matches your exam goal (JAMB)', 'For your class (SSS3)', 'For secondary school students like you']);
    expect(r.recommendations.some((x) => x.course.id === 'c3')).toBe(false); // university course, nothing in common
    expect(r.uncoveredExamGoals).toEqual([]);
  });

  it('university learner: level and course of study', () => {
    const r = rankCourses({ educationType: 'University', level: '200L', courseOfStudy: 'Computer Science' }, catalogue, new Set());
    expect(r.recommendations[0]).toMatchObject({ course: { id: 'c3' }, reasons: ['For your level (200L)', 'For university students like you', 'Related to your course of study (Computer Science)'] });
  });

  it('missing profile details are reported, not guessed; uncovered exam goals are visible', () => {
    const r = rankCourses({ examAimOrGoals: 'Post-UTME' }, catalogue, new Set());
    expect(r.missingProfile).toEqual(['education type', 'class']);
    expect(r.recommendations).toEqual([]);
    expect(r.uncoveredExamGoals).toEqual(['Post-UTME']);
  });

  it('normalises levels and finds exams (Post-UTME is not JAMB)', () => {
    expect(['SS 2', 'sss2', 'SS2'].map(normaliseLevel)).toEqual(['ss2', 'ss2', 'ss2']);
    expect(['300 Level', '300L', '300'].map(normaliseLevel)).toEqual(['300l', '300l', '300l']);
    expect(examsIn('Post-UTME screening')).toEqual(['Post-UTME']);
    expect(examsIn('UTME and WASSCE')).toEqual(['JAMB', 'WAEC']);
  });
});
