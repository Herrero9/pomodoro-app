import { Component, computed, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TimerService } from '../../../services/timer.service';
import {
  DEFAULT_SOUND_SPOTIFY_REF,
  DEFAULT_SOUND_VIDEO_ID,
  PRESETS,
  SOUND_SOURCES,
  SOUND_SOURCE_LABELS,
  extractSpotifyRef,
  extractYouTubeId,
} from '../../../models/pomodoro.model';

/** Right-hand sidebar of the desktop layout: sound, presets and cycle progress. */
@Component({
  selector: 'app-panel-side',
  templateUrl: './panel-side.component.html',
  styleUrls: ['./panel-side.component.scss'],
  standalone: false,
})
export class PanelSideComponent {
  readonly presets = PRESETS;
  readonly soundSources = SOUND_SOURCES;
  readonly soundSourceLabels = SOUND_SOURCE_LABELS;

  readonly timer = inject(TimerService);
  private readonly sanitizer = inject(DomSanitizer);

  /**
   * Embed URL for the selected background-sound source, falling back to that
   * source's default when the stored setting is not a usable reference.
   * Trusting the URL is safe because it is assembled here from an ID that
   * `extractYouTubeId` / `extractSpotifyRef` already validated against a strict
   * pattern.
   */
  readonly soundUrl = computed<SafeResourceUrl>(() => {
    const settings = this.timer.settings();
    if (settings.soundSource === 'spotify') {
      const ref = extractSpotifyRef(settings.soundSpotifyRef) ?? DEFAULT_SOUND_SPOTIFY_REF;
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://open.spotify.com/embed/${ref}?utm_source=generator`
      );
    }
    const id = extractYouTubeId(settings.soundVideoId) ?? DEFAULT_SOUND_VIDEO_ID;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${id}?rel=0`
    );
  });

  /** Name of the preset matching the current durations, or null for a custom setup. */
  readonly activePresetName = computed(() => {
    const settings = this.timer.settings();
    const match = this.presets.find(
      (p) => p.workMinutes === settings.workMinutes && p.breakMinutes === settings.shortBreakMinutes
    );
    return match?.name ?? null;
  });
}
