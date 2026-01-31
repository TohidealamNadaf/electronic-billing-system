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
  constructor(private platform: Platform, private databaseService: DatabaseService) {
    this.initializeApp();
  }

  async initializeApp() {
    this.platform.ready().then(async () => {
      await this.databaseService.initializePlugin();
      console.log('Database initialized');
    });
  }
}
