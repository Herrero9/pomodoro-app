import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TimerService } from '../../../services/timer.service';
import { DEFAULT_SOUND_VIDEO_ID, extractYouTubeId } from '../../../models/pomodoro.model';

/**
 * The background-sound video. Shared rather than owned by the desktop sidebar,
 * because the compact layout needs exactly the same thing.
 */
@Component({
  selector: 'app-sound-player',
  templateUrl: './sound-player.component.html',
  styleUrls: ['./sound-player.component.scss'],
  standalone: false,
})
export class SoundPlayerComponent {
  /**
   * `fill` grows to whatever height the container gives it (the desktop
   * sidebar, which is a flex column); `fixed` keeps a 16:9 box, for the
   * compact layout where the surrounding card has no height to hand out.
   */
  readonly variant = input<'fill' | 'fixed'>('fill');

  private readonly timer = inject(TimerService);
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
}
