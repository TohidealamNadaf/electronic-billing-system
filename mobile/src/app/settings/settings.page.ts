import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApiService } from '../services/api.service';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.page.html',
    styleUrls: ['./settings.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule, NgSelectModule]
})
export class SettingsPage implements OnInit {
    activeTab = signal('profile');
    settings: any = {
        companyName: '',
        companyAddress: '',
        companyPhone: '',
        gstRate: '18%',
        isGstEnabled: false,
        businessProfileConfig: { nameDisplayType: 'company', displayFields: [] }
    };

    successMessage = signal(false);

    constructor(private api: ApiService) { }

    ngOnInit() {
        this.api.getSettings().subscribe((data: any) => {
            // Safe Parse
            let config = data.businessProfileConfig;
            if (typeof config === 'string') {
                try { config = JSON.parse(config); } catch (e) { config = {}; }
            }
            if (!config || typeof config !== 'object') config = {};

            // Ensure defaults
            if (!config.nameDisplayType) config.nameDisplayType = 'company';
            if (!config.displayFields) {
                config.displayFields = [
                    { id: 'address', key: 'Address', show: true, type: 'textarea' },
                    { id: 'phone', key: 'Phone', show: true, type: 'text' },
                    { id: 'gst', key: 'GST No', show: true, type: 'text' }
                ];
            }

            data.businessProfileConfig = config;
            this.settings = data;
        });
    }

    saveSettings() {
        const toSave = {
            ...this.settings,
            businessProfileConfig: JSON.stringify(this.settings.businessProfileConfig)
        };

        this.api.updateSettings(toSave).subscribe({
            next: () => {
                this.successMessage.set(true);
                setTimeout(() => this.successMessage.set(false), 2000);
            },
            error: (err) => alert('Failed to save: ' + err.message)
        });
    }
}
