import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular/lazy';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';
import { HomeHeaderComponent } from './components/home-header/home-header.component';
import { PanelMainComponent } from './components/panel-main/panel-main.component';
import { PanelSideComponent } from './components/panel-side/panel-side.component';

import { HomePageRoutingModule } from './home-routing.module';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule
  ],
  declarations: [HomePage, HomeHeaderComponent, PanelMainComponent, PanelSideComponent]
})
export class HomePageModule {}
