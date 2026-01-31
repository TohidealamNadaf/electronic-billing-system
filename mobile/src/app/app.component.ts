import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { DatabaseService } from './services/database.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  isAppReady = false;
  initError = '';

  constructor(private platform: Platform, private databaseService: DatabaseService) {
    this.initializeApp();
  }

  async initializeApp() {
    this.platform.ready().then(async () => {
      try {
        await this.databaseService.initializePlugin();
        console.log('Database initialized');
        this.isAppReady = true;
      } catch (e: any) {
        console.error('Initialization failed', e);
        this.initError = e.message || JSON.stringify(e);
      }
    });
  }
}
