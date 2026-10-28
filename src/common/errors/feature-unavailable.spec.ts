import { NotImplementedException } from '@nestjs/common';
import { featureUnavailable, FEATURE_UNAVAILABLE } from './feature-unavailable.js';
import { AiService } from '../../ai/ai.service.js';
import { AiVoiceController } from '../../ai-voice/ai-voice.controller.js';

async function expectUnavailable(promiseOrFn: Promise<unknown> | (() => unknown), feature: string) {
  let error: unknown;
  try {
    await (typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn);
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(NotImplementedException);
  const ex = error as NotImplementedException;
  expect(ex.getStatus()).toBe(501);
  expect(ex.getResponse()).toEqual({
    statusCode: 501,
    error: 'Not Implemented',
    code: FEATURE_UNAVAILABLE,
    feature,
    message: expect.stringMatching(new RegExp(`^${feature} is not available yet: .+\\.$`)),
  });
}

describe('featureUnavailable: one documented 501 for unimplemented capabilities', () => {
  it('builds the documented body', async () => {
    await expectUnavailable(() => {
      throw featureUnavailable('Example', 'because');
    }, 'Example');
  });

  it('document AI: saved analysis, saved content, live stream and PDF export never reach the AI service or files', async () => {
    const files = { findFileById: vi.fn() };
    const ai = new AiService(files as never);
    await expectUnavailable(ai.getAnalysis('f1'), 'Saved document analysis');
    await expectUnavailable(ai.getAllGeneratedContent('f1'), 'Saved generated content');
    await expectUnavailable(ai.getLiveClassStream('f1'), 'Live class streaming');
    await expectUnavailable(ai.exportPdf('f1', {} as never), 'PDF export');
    expect(files.findFileById).not.toHaveBeenCalled();
  });

  it('voice: transcription and synthesis are unavailable (no speech provider); respond is unchanged', async () => {
    const voice = { proxyToPython: vi.fn(async () => ({ ok: true })) };
    const controller = new AiVoiceController(voice as never);
    await expectUnavailable(() => (controller as any).transcribe(), 'Speech transcription');
    await expectUnavailable(() => (controller as any).synthesize(), 'Speech synthesis');
    await expect((controller as any).respond({ id: 'u1' }, { text: 'hi' })).resolves.toEqual({ ok: true });
    expect(voice.proxyToPython).toHaveBeenCalledTimes(1);
  });

  // recommendations are now computed from the learner's records: src/recommendations/learning-recommendations.spec.ts
});
