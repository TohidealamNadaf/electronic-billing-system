import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './entities/settings.entity';

@Injectable()
export class SettingsService implements OnModuleInit {
    constructor(
        @InjectRepository(Settings)
        private settingsRepo: Repository<Settings>,
    ) { }

    async onModuleInit() {
        // Ensure at least one settings row exists
        const settings = await this.settingsRepo.find();
        if (settings.length === 0) {
            const defaultSettings = this.settingsRepo.create({
                companyName: 'Professional Carpentry Services',
                companyAddress: 'Add Your Business Address',
                companyPhone: 'Add Your Contact info',
                isGstEnabled: true,
                gstRate: '18%',
                isDiscountEnabled: false,
                columnLabels: JSON.stringify({
                    product: 'Description',
                    quantity: 'Qty',
                    price: 'Unit Price',
                    total: 'Total'
                }),
                customColumns: JSON.stringify([])
            });
            await this.settingsRepo.save(defaultSettings);
        }
    }

    async getSettings(): Promise<Settings> {
        const settings = await this.settingsRepo.find();
        return settings[0];
    }

    async updateSettings(data: Partial<Settings>): Promise<Settings> {
        const settings = await this.getSettings();
        Object.assign(settings, data);
        return this.settingsRepo.save(settings);
    }
}
