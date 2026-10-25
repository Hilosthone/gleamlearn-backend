import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SignupDto } from './signup.dto.js';

const base = { fullName: 'Ada Lovelace', username: 'ada', email: 'ada@example.com', password: 'Secret-1!', confirmPassword: 'Secret-1!' };

async function errorsFor(body: Record<string, unknown>) {
  const dto = plainToInstance(SignupDto, body);
  const errors = await validate(dto);
  return { dto, fields: errors.map((e) => e.property), messages: errors.flatMap((e) => Object.values(e.constraints ?? {})) };
}

describe('SignupDto validation (400 instead of a database error)', () => {
  it('accepts what the registration wizard sends (secondary path)', async () => {
    const { fields } = await errorsFor({
      ...base,
      dateOfBirth: '2008-04-01',
      country: 'Nigeria',
      educationType: 'Secondary',
      secondarySchool: 'Test Secondary School',
      secondaryClass: 'SS 3',
      examAimOrGoals: 'Distinctions in WAEC',
      preferredStudyTime: 'Evening',
    });
    expect(fields).toEqual([]);
  });

  it('accepts the exam path with a long composed examAimOrGoals (wizard maximum is about 1,300 characters)', async () => {
    const { fields } = await errorsFor({ ...base, examAimOrGoals: 'x'.repeat(1400) });
    expect(fields).toEqual([]);
  });

  it.each([
    ['fullName', 'x'.repeat(151)],
    ['username', 'x'.repeat(101)],
    ['email', `${'x'.repeat(250)}@example.com`],
    ['country', 'x'.repeat(101)],
    ['secondarySchool', 'x'.repeat(256)],
    ['examAimOrGoals', 'x'.repeat(2001)],
  ])('rejects an over-long %s with a field message', async (field, value) => {
    const { fields, messages } = await errorsFor({ ...base, [field]: value });
    expect(fields).toContain(field);
    expect(messages.join(' ')).toMatch(new RegExp(`^${field} must be|${field} must be`));
  });

  it('rejects passwords longer than 128 characters (bcrypt would silently ignore the rest)', async () => {
    const long = 'x'.repeat(129);
    const { fields } = await errorsFor({ ...base, password: long, confirmPassword: long });
    expect(fields).toEqual(expect.arrayContaining(['password', 'confirmPassword']));
  });

  it('rejects a date of birth that is not YYYY-MM-DD', async () => {
    const { fields, messages } = await errorsFor({ ...base, dateOfBirth: '01/04/2008' });
    expect(fields).toEqual(['dateOfBirth']);
    expect(messages[0]).toMatch(/^dateOfBirth must be a date/);
  });

  it('trims names and treats whitespace-only names as missing', async () => {
    const ok = await errorsFor({ ...base, fullName: '  Ada  ', username: ' ada ' });
    expect(ok.dto.fullName).toBe('Ada');
    expect(ok.dto.username).toBe('ada');
    const blank = await errorsFor({ ...base, fullName: '   ' });
    expect(blank.fields).toContain('fullName');
  });

  it('normalises the email (trim + lower case) before validating it', async () => {
    const { dto, fields } = await errorsFor({ ...base, email: '  Ada@Example.COM ' });
    expect(fields).toEqual([]);
    expect(dto.email).toBe('ada@example.com');
  });
});
