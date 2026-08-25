import { describe, expect, it } from 'vitest';
import { MmssPipe } from './mmss.pipe';

describe('MmssPipe', () => {
  const pipe = new MmssPipe();

  it('pads minutes and seconds to two digits', () => {
    expect(pipe.transform(0)).toBe('00:00');
    expect(pipe.transform(9)).toBe('00:09');
    expect(pipe.transform(65)).toBe('01:05');
  });

  it('lets the minutes grow past an hour', () => {
    expect(pipe.transform(90 * 60)).toBe('90:00');
  });

  it('never shows a negative countdown', () => {
    expect(pipe.transform(-5)).toBe('00:00');
  });
});
