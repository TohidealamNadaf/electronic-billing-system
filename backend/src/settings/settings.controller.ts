import { Controller, Get, Patch, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Settings } from './entities/settings.entity';

@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    getSettings(): Promise<Settings> {
        return this.settingsService.getSettings();
    }

    @Patch()
    updateSettings(@Body() data: Partial<Settings>): Promise<Settings> {
        return this.settingsService.updateSettings(data);
    }
}
