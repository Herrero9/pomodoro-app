import { describe, expect, it } from 'vitest';

import { extractSpotifyRef, extractYouTubeId } from './pomodoro.model';

describe('extractSpotifyRef', () => {
  const ref = 'playlist/37i9dQZF1DWWQRwui0ExPn';

  it('accepts a shared link, with or without the locale segment', () => {
    expect(extractSpotifyRef('https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn')).toBe(ref);
    expect(
      extractSpotifyRef('https://open.spotify.com/intl-es/playlist/37i9dQZF1DWWQRwui0ExPn?si=abc')
    ).toBe(ref);
  });

  it('accepts an embed URL, a spotify: URI and an already normalized path', () => {
    expect(extractSpotifyRef('https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn')).toBe(
      ref
    );
    expect(extractSpotifyRef('spotify:playlist:37i9dQZF1DWWQRwui0ExPn')).toBe(ref);
    expect(extractSpotifyRef(`  ${ref}  `)).toBe(ref);
  });

  it('keeps the content type of non-playlist references', () => {
    expect(extractSpotifyRef('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')).toBe(
      'track/4cOdK2wGLETKBW3PvgPWqT'
    );
  });

  it('rejects other hosts, unknown types and malformed IDs', () => {
    expect(extractSpotifyRef('https://example.com/playlist/37i9dQZF1DWWQRwui0ExPn')).toBeNull();
    expect(extractSpotifyRef('https://open.spotify.com/user/37i9dQZF1DWWQRwui0ExPn')).toBeNull();
    expect(extractSpotifyRef('https://open.spotify.com/playlist/tooshort')).toBeNull();
    expect(extractSpotifyRef('')).toBeNull();
  });
});

describe('extractYouTubeId', () => {
  it('accepts a watch URL, a youtu.be link and a bare ID', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=jfKfPfyJRdk')).toBe('jfKfPfyJRdk');
    expect(extractYouTubeId('https://youtu.be/jfKfPfyJRdk')).toBe('jfKfPfyJRdk');
    expect(extractYouTubeId('jfKfPfyJRdk')).toBe('jfKfPfyJRdk');
  });

  it('rejects a Spotify link', () => {
    expect(extractYouTubeId('https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn')).toBeNull();
  });
});
