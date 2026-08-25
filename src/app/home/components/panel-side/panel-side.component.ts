import { Component, computed, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TimerService } from '../../../services/timer.service';
import { DEFAULT_SOUND_VIDEO_ID, PRESETS, extractYouTubeId } from '../../../models/pomodoro.model';

/** Right-hand sidebar of the desktop layout: sound, presets and cycle progress. */
@Component({
  selector: 'app-panel-side',
  templateUrl: './panel-side.component.html',
  styleUrls: ['./panel-side.component.scss'],
  standalone: false,
})
export class PanelSideComponent {
  readonly presets = PRESETS;

  readonly timer = inject(TimerService);
  private readonly sanitizer = inject(DomSanitizer);

  /**
   * Embed URL for the background-sound video, falling back to the default one
   * when the stored setting is not a usable YouTube reference. Trusting the URL
   * is safe because it is assembled here from an ID that `extractYouTubeId`
   * already validated against a strict pattern.
   */
  readonly soundUrl = computed<SafeResourceUrl>(() => {
    const id = extractYouTubeId(this.timer.settings().soundVideoId) ?? DEFAULT_SOUND_VIDEO_ID;
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
