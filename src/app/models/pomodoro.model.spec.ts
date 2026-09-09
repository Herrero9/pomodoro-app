import { describe, expect, it } from 'vitest';

import { extractYouTubeId } from './pomodoro.model';

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
