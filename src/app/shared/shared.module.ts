import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular/lazy';

import { MmssPipe } from './pipes/mmss.pipe';
import { ProgressRingComponent } from './components/progress-ring/progress-ring.component';
import { ProgressDotsComponent } from './components/progress-dots/progress-dots.component';
import { TimerControlsComponent } from './components/timer-controls/timer-controls.component';

/**
 * Presentational pieces reused across layouts. They read `TimerService`
 * themselves or take plain inputs, so they carry no page-specific wiring.
 */
const EXPORTED = [MmssPipe, ProgressRingComponent, ProgressDotsComponent, TimerControlsComponent];

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [...EXPORTED],
  exports: [...EXPORTED],
})
export class SharedModule {}
