import { describe, expect, it } from 'vitest';

import { extractYouTubeId, formatFocusDuration } from './pomodoro.model';

describe('extractYouTubeId', () => {
  it('accepts a watch URL, a youtu.be link and a bare ID', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=jfKfPfyJRdk')).toBe('jfKfPfyJRdk');
    expect(extractYouTubeId('https://youtu.be/jfKfPfyJRdk')).toBe('jfKfPfyJRdk');
    expect(extractYouTubeId('  jfKfPfyJRdk  ')).toBe('jfKfPfyJRdk');
  });

  it('accepts an embed URL, including the nocookie host', () => {
    expect(extractYouTubeId('https://www.youtube.com/embed/jfKfPfyJRdk')).toBe('jfKfPfyJRdk');
    expect(extractYouTubeId('https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?rel=0')).toBe(
      'jfKfPfyJRdk'
    );
  });

  it('rejects other hosts and malformed IDs', () => {
    expect(extractYouTubeId('https://example.com/watch?v=jfKfPfyJRdk')).toBeNull();
    expect(extractYouTubeId('https://www.youtube.com/watch?v=tooshort')).toBeNull();
    expect(extractYouTubeId('')).toBeNull();
  });
});

describe('formatFocusDuration', () => {
  it('rounds down to whole minutes below an hour', () => {
    expect(formatFocusDuration(0)).toBe('0 min');
    expect(formatFocusDuration(59)).toBe('0 min');
    expect(formatFocusDuration(25 * 60)).toBe('25 min');
  });

  it('splits an hour or more into hours and minutes', () => {
    expect(formatFocusDuration(3600)).toBe('1 h');
    expect(formatFocusDuration(3600 + 25 * 60)).toBe('1 h 25 min');
    expect(formatFocusDuration(5 * 3600 + 59 * 60 + 59)).toBe('5 h 59 min');
  });
});
