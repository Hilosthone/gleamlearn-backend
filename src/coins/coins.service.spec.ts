import { CoinsService } from './coins.service.js';

/** coin_transactions.type is NOT NULL; every reward used to fail with a database error after XP was awarded. */
describe('CoinsService writes a transaction type', () => {
  function build(balance = 100) {
    const saved: any[] = [];
    const repo = {
      create: vi.fn((d: any) => d),
      save: vi.fn(async (d: any) => {
        saved.push(d);
        return d;
      }),
    };
    const service = new CoinsService(repo as never);
    vi.spyOn(service, 'getUserBalance').mockResolvedValue({ balance } as never);
    return { service, saved };
  }

  it('awards are EARN with a positive amount', async () => {
    const { service, saved } = build();
    await service.awardCoins('u1', 10, 'QUIZ_COMPLETED', 'quiz');
    expect(saved[0]).toMatchObject({ userId: 'u1', amount: 10, type: 'EARN', source: 'QUIZ_COMPLETED' });
  });

  it('spending is SPEND with a negative amount', async () => {
    const { service, saved } = build();
    await service.spendCoins('u1', 7, 'STORE', 'item');
    expect(saved[0]).toMatchObject({ amount: -7, type: 'SPEND' });
  });
});
