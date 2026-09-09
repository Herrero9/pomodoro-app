import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsPage } from './settings.page';
import { AlertService } from '../services/alert.service';
import { DEFAULT_SETTINGS } from '../models/pomodoro.model';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;
  let permissionGranted: boolean;

  beforeEach(() => {
    permissionGranted = true;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AlertService,
          useValue: {
            prime: () => undefined,
            notifyPhaseEnded: () => undefined,
            requestNotificationPermission: vi.fn(async () => permissionGranted),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('turns notifications on once the browser grants permission', async () => {
    await component.setNotifications(true);

    expect(component.form.alertNotification).toBe(true);
    expect(component.notificationsBlocked()).toBe(false);
  });

  it('leaves the notification toggle off, and says why, when permission is refused', async () => {
    permissionGranted = false;

    await component.setNotifications(true);

    expect(component.form.alertNotification).toBe(false);
    expect(component.notificationsBlocked()).toBe(true);
  });

  it('restores every field to its default', () => {
    component.form.workMinutes = 90;
    component.form.autoStartWork = false;

    component.restoreDefaults();

    expect(component.form).toEqual(DEFAULT_SETTINGS);
  });
});
