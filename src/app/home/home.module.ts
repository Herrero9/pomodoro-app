import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular/lazy';
import { FormsModule } from '@angular/forms';

import { SharedModule } from '../shared/shared.module';
import { HomePage } from './home.page';
import { HomeHeaderComponent } from './components/home-header/home-header.component';
import { BreakOverlayComponent } from './components/break-overlay/break-overlay.component';
import { PanelCompactComponent } from './components/panel-compact/panel-compact.component';
import { PanelMainComponent } from './components/panel-main/panel-main.component';
import { PanelSideComponent } from './components/panel-side/panel-side.component';
import { PeriodHistoryComponent } from './components/period-history/period-history.component';

import { HomePageRoutingModule } from './home-routing.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, SharedModule, HomePageRoutingModule],
  declarations: [
    HomePage,
    HomeHeaderComponent,
    BreakOverlayComponent,
    PanelCompactComponent,
    PanelMainComponent,
    PanelSideComponent,
    PeriodHistoryComponent,
  ],
})
export class HomePageModule {}
