import { findUserByEmail, normalizeEmail } from './email-identity.js';
import { emailAwareRepo } from '../../test/support/email-aware-repo.js';

describe('normalizeEmail', () => {
  it('trims and lower-cases; non-strings become empty', () => {
    expect(normalizeEmail('  Ada.Lovelace@Example.COM ')).toBe('ada.lovelace@example.com');
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail(42)).toBe('');
  });
});

describe('findUserByEmail', () => {
  it('finds a normalised account with one exact lookup', async () => {
    const repo = emailAwareRepo([{ id: 'u1', email: 'ada@example.com' }]);
    await expect(findUserByEmail(repo as never, ' ADA@example.com')).resolves.toMatchObject({ id: 'u1' });
    expect(repo.findOne).toHaveBeenCalledTimes(1);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'ada@example.com' } });
  });

  it('still finds an account stored with capitals before normalisation (no data migration needed)', async () => {
    const repo = emailAwareRepo([{ id: 'legacy', email: 'Ada@Example.com' }]);
    await expect(findUserByEmail(repo as never, 'ada@EXAMPLE.com')).resolves.toMatchObject({ id: 'legacy' });
    expect(repo.findOne).toHaveBeenCalledTimes(2);
  });

  it('returns null for unknown or empty input without querying on empty', async () => {
    const repo = emailAwareRepo([]);
    await expect(findUserByEmail(repo as never, 'nobody@example.com')).resolves.toBeNull();
    repo.findOne.mockClear();
    await expect(findUserByEmail(repo as never, '   ')).resolves.toBeNull();
    expect(repo.findOne).not.toHaveBeenCalled();
  });
});
