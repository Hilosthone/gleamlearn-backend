import { validateVisual, validateVisualLesson } from './visual-lesson.js';

describe('visual lesson validation (data only, a closed set of renderers)', () => {
  it('keeps each supported type with clamped, bounded values', () => {
    expect(validateVisual({ type: 'shape3d', shape: 'cylinder', dimensions: { radius: 500, height: 2 }, labels: ['r', 'h'] })).toMatchObject({ shape: 'cylinder', dimensions: { radius: 100, height: 2 } });
    expect(validateVisual({ type: 'graph2d', family: 'quadratic', a: 1, xMin: 5, xMax: -5 })).toMatchObject({ family: 'quadratic', xMin: -10, xMax: 10 });
    expect(validateVisual({ type: 'wave', amplitude: 99, waves: 3.7 })).toMatchObject({ amplitude: 5, waves: 4 });
    expect(validateVisual({ type: 'orbit', center: 'Sun', bodies: [{ label: 'Earth', radius: 3, period: 10 }] })).toMatchObject({ center: 'Sun' });
    expect(validateVisual({ type: 'vectors', vectors: [{ x: 3, y: 0, label: 'F1' }, { x: 0, y: 0 }] })).toMatchObject({ vectors: [{ label: 'F1' }] });
    expect(validateVisual({ type: 'labeled', parts: [{ label: 'Nucleus', description: 'Holds DNA' }] })).toMatchObject({ parts: [{ label: 'Nucleus' }] });
  });

  it('refuses anything outside the registry: unknown types, shapes, families, elements; dangling references', () => {
    expect(validateVisual({ type: 'html', html: '<script>' })).toBeNull();
    expect(validateVisual({ type: 'shape3d', shape: 'teapot' })).toBeNull();
    expect(validateVisual({ type: 'graph2d', family: 'eval', expression: 'process.exit()' })).toBeNull();
    expect(validateVisual({ type: 'molecule', atoms: [{ id: 'x', element: 'Unobtainium' }] })).toBeNull();
    expect(validateVisual({ type: 'molecule', atoms: [{ id: 'a', element: 'C' }, { id: 'a', element: 'O' }] })).toBeNull(); // duplicate ids
    const flow = validateVisual({ type: 'flow', nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'ghost' }] });
    expect(flow?.edges).toEqual([{ from: 'a', to: 'b', label: '' }]);
    // unknown fields never survive
    expect(validateVisual({ type: 'wave', onClick: 'x', url: 'https://evil' })).not.toHaveProperty('url');
  });

  it('a lesson needs at least two steps with text; bad visuals are dropped, text kept, control characters removed', () => {
    expect(validateVisualLesson({ steps: [{ title: 'a', explanation: 'b' }] })).toBeNull();
    const l = validateVisualLesson({ title: 'T\u0007', steps: [{ title: 'a', explanation: 'b', visual: { type: 'nope' } }, { title: 'c', explanation: 'd' }], keyTakeaways: ['k', 7] });
    expect(l).toMatchObject({ version: 1, title: 'T', keyTakeaways: ['k'] });
    expect(l!.steps.map((s) => s.visual)).toEqual([null, null]);
  });
});

describe('visualLessonText', () => {
  it('turns a stored lesson into plain text for further learning, and unreadable content into nothing', async () => {
    const { visualLessonText } = await import('./visual-lesson.js');
    const content = JSON.stringify({ title: 'Water', summary: 'S', steps: [{ title: 'A', explanation: 'one' }, { title: 'B', explanation: 'two' }], keyTakeaways: ['k'] });
    expect(visualLessonText(content)).toBe('Water\n\nS\n\n1. A\none\n\n2. B\ntwo\n\nKey takeaways: k');
    expect(visualLessonText('{not json')).toBe('');
  });
});
