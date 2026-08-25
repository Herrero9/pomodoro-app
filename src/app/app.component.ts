import { Component, inject } from '@angular/core';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  // Injected for its side effect: creating the service applies the stored
  // theme to <body> before the first page renders.
  private readonly theme = inject(ThemeService);
}
