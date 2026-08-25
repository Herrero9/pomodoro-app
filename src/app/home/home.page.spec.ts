import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular/lazy';
import { RouterModule } from '@angular/router';

import { HomePage } from './home.page';
import { HomeHeaderComponent } from './components/home-header/home-header.component';
import { PanelMainComponent } from './components/panel-main/panel-main.component';
import { PanelSideComponent } from './components/panel-side/panel-side.component';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomePage, HomeHeaderComponent, PanelMainComponent, PanelSideComponent],
      imports: [IonicModule.forRoot(), RouterModule.forRoot([])]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
