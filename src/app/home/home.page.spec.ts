import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular/lazy';
import { RouterModule } from '@angular/router';

import { HomePage } from './home.page';
import { HomePageModule } from './home.module';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    // Importing the real feature module keeps the test in step with whatever
    // components the page is composed of.
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), RouterModule.forRoot([]), HomePageModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
