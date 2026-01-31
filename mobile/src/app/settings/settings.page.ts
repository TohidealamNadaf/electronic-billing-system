import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ItemReorderEventDetail } from '@ionic/angular';
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
        companyOwner: '',
        companyAddress: '',
        companyPhone: '',
        isGstEnabled: true,
        gstRate: '18%',
        gstNumber: '',
        businessProfileConfig: {
            showName: true,
            nameDisplayType: 'company',
            showAddress: true,
            showContact: true,
            showGst: true,
            displayFields: [] // {id, key, value, show, isBuiltIn, type}
        },
        showTerms: true,
        termsAndConditions: '',
        isDiscountEnabled: false
    };

    saving = signal(false);
    successMessage = signal(false);

    // Table Setup
    columnLabels: any = { product: 'Description', quantity: 'Qty', price: 'Unit Price', total: 'Total' };
    customColumns: any[] = [];
    columnTypes = [
        { label: '🔢 Calculated', value: 'calculated' },
        { label: '✍️ Manual Text', value: 'text' },
        { label: '📏 Manual Number', value: 'number' }
    ];

    constructor(private api: ApiService) { }

    ngOnInit() {
        this.api.getSettings().subscribe((data: any) => {
            // 1. Parse Business Profile Config
            let config: any = {
                showName: true,
                nameDisplayType: 'company',
                showAddress: true,
                showContact: true,
                showGst: true,
                displayFields: []
            };

            if (data.businessProfileConfig) {
                try {
                    const parsed = typeof data.businessProfileConfig === 'string' ? JSON.parse(data.businessProfileConfig) : data.businessProfileConfig;
                    config = { ...config, ...(typeof parsed === 'object' ? parsed : {}) };

                    if (!config.nameDisplayType) config.nameDisplayType = 'company';
                } catch (e) { console.error('Config Parse Error', e); }
            }

            // Ensure displayFields exists (Moved outside to guarantee initialization)
            if (!config.displayFields || config.displayFields.length === 0) {
                config.displayFields = [
                    { id: 'address', key: 'Business Address', show: config.showAddress ?? true, isBuiltIn: true, type: 'textarea' },
                    { id: 'phone', key: 'Phone Number', show: config.showContact ?? true, isBuiltIn: true, type: 'text' },
                    { id: 'gst', key: 'GST Number', show: config.showGst ?? true, isBuiltIn: true, type: 'text' }
                ];
            }

            data.businessProfileConfig = config;

            // 2. Parse Custom Columns (Unified)
            let mergedCols: any[] = [];
            const builtInDefaults = [
                { id: 'product', isBuiltIn: true },
                { id: 'quantity', isBuiltIn: true },
                { id: 'price', isBuiltIn: true },
                { id: 'total', isBuiltIn: true }
            ];

            if (data.customColumns) {
                try {
                    const parsed = typeof data.customColumns === 'string' ? JSON.parse(data.customColumns) : data.customColumns;
                    const hasBuiltIn = parsed.some((c: any) => c.isBuiltIn);

                    if (!hasBuiltIn) {
                        // Migration from old schema
                        mergedCols = [
                            ...builtInDefaults,
                            ...parsed.map((c: any) => ({ ...c, isBuiltIn: false, id: 'custom_' + Math.random().toString(36).substr(2, 9) }))
                        ];
                    } else {
                        mergedCols = parsed;
                    }
                } catch (e) { mergedCols = [...builtInDefaults]; }
            } else {
                mergedCols = [...builtInDefaults];
            }

            this.customColumns = mergedCols.map((c: any) => ({
                ...c,
                name: c.isBuiltIn ? '' : (c.name || ''),
                type: c.isBuiltIn ? '' : (c.type || 'calculated'),
                formula: c.isBuiltIn ? '' : (c.formula || ''),
                isCurrency: c.isCurrency !== undefined ? c.isCurrency : true
            }));

            if (data.columnLabels) {
                try {
                    const labels = typeof data.columnLabels === 'string' ? JSON.parse(data.columnLabels) : data.columnLabels;
                    this.columnLabels = { ...this.columnLabels, ...labels };
                } catch (e) { }
            }

            this.settings = data;
        });
    }

    addBusinessCustomField() {
        this.settings.businessProfileConfig.displayFields.push({
            id: 'custom_' + Date.now(),
            key: '',
            value: '',
            show: true,
            isBuiltIn: false
        });
    }

    removeBusinessCustomField(index: number) {
        this.settings.businessProfileConfig.displayFields.splice(index, 1);
    }

    doReorderFields(ev: CustomEvent<ItemReorderEventDetail>) {
        const fields = this.settings.businessProfileConfig.displayFields;
        const itemToMove = fields.splice(ev.detail.from, 1)[0];
        fields.splice(ev.detail.to, 0, itemToMove);
        ev.detail.complete();
    }

    addCustomColumn() {
        this.customColumns.push({
            id: 'custom_' + Math.random().toString(36).substr(2, 9),
            name: '',
            type: 'calculated',
            formula: '',
            isCurrency: true,
            isBuiltIn: false
        });
    }

    removeCustomColumn(index: number) {
        if (this.customColumns[index].isBuiltIn) return;
        this.customColumns.splice(index, 1);
    }

    doReorderColumns(ev: CustomEvent<ItemReorderEventDetail>) {
        const cols = this.customColumns;
        const itemToMove = cols.splice(ev.detail.from, 1)[0];
        cols.splice(ev.detail.to, 0, itemToMove);
        ev.detail.complete();
    }

    saveSettings() {
        this.saving.set(true);

        // Update flattened show flags from displayFields for backward compat
        const fields = this.settings.businessProfileConfig.displayFields;
        this.settings.businessProfileConfig.showAddress = fields.find((f: any) => f.id === 'address')?.show ?? true;
        this.settings.businessProfileConfig.showContact = fields.find((f: any) => f.id === 'phone')?.show ?? true;
        this.settings.businessProfileConfig.showGst = fields.find((f: any) => f.id === 'gst')?.show ?? true;

        const toSave = {
            ...this.settings,
            columnLabels: JSON.stringify(this.columnLabels),
            customColumns: JSON.stringify(this.customColumns),
            businessProfileConfig: JSON.stringify(this.settings.businessProfileConfig)
        };

        this.api.updateSettings(toSave).subscribe({
            next: (updated: any) => {
                // Determine success without full reload
                this.saving.set(false);
                this.successMessage.set(true);
                setTimeout(() => this.successMessage.set(false), 2000);
            },
            error: (err) => {
                this.saving.set(false);
                alert('Failed to save: ' + err.message);
            }
        });
    }
}
