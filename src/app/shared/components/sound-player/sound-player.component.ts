import { Component, computed, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TimerService } from '../../../services/timer.service';
import { DEFAULT_SOUND_VIDEO_ID, extractYouTubeId } from '../../../models/pomodoro.model';

/**
 * The background-sound video, shown in the desktop sidebar only. It grows to
 * whatever height that flex column gives it.
 */
@Component({
  selector: 'app-sound-player',
  templateUrl: './sound-player.component.html',
  styleUrls: ['./sound-player.component.scss'],
  standalone: false,
})
export class SoundPlayerComponent {
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
