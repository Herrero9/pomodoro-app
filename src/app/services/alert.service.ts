import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { PHASE_ALERTS, PomodoroPhase, PomodoroSettings } from '../models/pomodoro.model';

/** Chime layout: two short notes a fifth apart, the second one softer. */
const CHIME_NOTES = [
  { frequency: 880, startAt: 0, duration: 0.18 },
  { frequency: 1318.5, startAt: 0.16, duration: 0.32 },
];
const CHIME_GAIN = 0.18;

/**
 * Everything the app does to tell the user a phase just ended: a chime, a
 * vibration on device, and a system notification. It is deliberately the only
 * place that touches those three APIs, and every one of them is optional --
 * a browser without WebAudio, a web build without Capacitor, or a user who
 * never granted notification permission all just get less feedback, never an
 * error.
 */
@Injectable({ providedIn: 'root' })
export class AlertService {
  private context?: AudioContext;

  /**
   * Opens (or resumes) the audio context from inside a user gesture. Browsers
   * refuse to start one from a timer callback, so `TimerService.start()` calls
   * this on the click that starts the countdown, minutes before the chime is
   * actually due.
   */
  prime(): void {
    const context = this.audioContext();
    if (context?.state === 'suspended') {
      void context.resume();
    }
  }

  /** Fires whichever alerts the settings have enabled for a phase that just ended. */
  notifyPhaseEnded(finishedPhase: PomodoroPhase, settings: PomodoroSettings): void {
    if (settings.alertSound) {
      this.chime();
      this.vibrate();
    }
    if (settings.alertNotification) {
      this.notify(finishedPhase);
    }
  }

  /**
   * Asks for notification permission, returning whether it ended up granted.
   * Called from the settings toggle -- i.e. from a user gesture, which is what
   * browsers require -- rather than on startup.
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (typeof Notification === 'undefined') {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission === 'denied') {
      return false;
    }
    try {
      return (await Notification.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }

  /** Two synthesised notes -- no audio asset to ship, cache or fail to load. */
  private chime(): void {
    const context = this.audioContext();
    if (!context) {
      return;
    }
    if (context.state === 'suspended') {
      void context.resume();
    }

    const now = context.currentTime;
    for (const note of CHIME_NOTES) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = note.frequency;

      // Ramp both ends: a square-edged gain change is audible as a click.
      const start = now + note.startAt;
      const end = start + note.duration;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(CHIME_GAIN, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(end);
    }
  }

  private vibrate(): void {
    if (Capacitor.isNativePlatform()) {
      void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
      return;
    }
    // Android browsers still honour this; iOS Safari ignores it silently.
    navigator.vibrate?.([120, 80, 120]);
  }

  private notify(finishedPhase: PomodoroPhase): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }
    const alert = PHASE_ALERTS[finishedPhase];
    try {
      // A fixed tag means a phase change replaces the previous notification
      // instead of stacking a morning's worth of them.
      new Notification(alert.title, { body: alert.body, tag: 'pomodoro-phase' });
    } catch {
      // Some browsers only allow notifications through a service worker.
    }
  }

  private audioContext(): AudioContext | undefined {
    if (this.context) {
      return this.context;
    }
    if (typeof AudioContext === 'undefined') {
      return undefined;
    }
    this.context = new AudioContext();
    return this.context;
  }
}
