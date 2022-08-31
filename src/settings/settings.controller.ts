import { Controller, Get, Body, Put, Patch } from '@nestjs/common'
import { DeviceNameDto } from './dto/device-name.dto'
import { SettingsPatchDto, SettingsPutDto } from './dto/settings.dto'
import { SiteNameDto } from './dto/site-name.dto'
import { SystemTimeDto } from './dto/system-time.dto'
import { TimeZoneDto } from './dto/time-zone.dto'
import { TimeZonesDto } from './dto/time-zones.dto'
import { Settings } from './settings'
import { SettingsService } from './settings.service'

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAllSettings(): Promise<Settings> {
    return this.settingsService.getAllSettings()
  }

  @Patch()
  updateSettings(@Body() settings: SettingsPatchDto): Promise<void> {
    return this.settingsService.updateSettings(settings)
  }

  @Put()
  updateAllSettings(@Body() settings: SettingsPutDto): Promise<void> {
    return this.settingsService.updateAllSettings(settings)
  }

  @Get('siteName')
  async getSiteName(): Promise<SiteNameDto> {
    const siteName = await this.settingsService.getSiteName()
    return {
      siteName,
    }
  }

  @Put('siteName')
  setSiteName(@Body() body: SiteNameDto): Promise<void> {
    return this.settingsService.setSiteName(body.siteName)
  }

  @Get('deviceName')
  async getDeviceName(): Promise<DeviceNameDto> {
    const deviceName = await this.settingsService.getDeviceName()
    return {
      deviceName,
    }
  }

  @Put('deviceName')
  setDeviceName(@Body() body: DeviceNameDto): Promise<void> {
    return this.settingsService.setDeviceName(body.deviceName)
  }

  @Get('systemTime')
  async getSystemTime(): Promise<SystemTimeDto> {
    const systemTime = await this.settingsService.getSystemTime()
    return {
      systemTime,
    }
  }

  @Put('systemTime')
  setSystemTime(@Body() body: SystemTimeDto): Promise<void> {
    return this.settingsService.setSystemTime(body.systemTime)
  }

  @Get('timeZones')
  async getAvailableTimeZones(): Promise<TimeZonesDto> {
    const timeZones = await this.settingsService.getAvailableTimeZones()
    return {
      timeZones,
    }
  }

  @Get('timeZone')
  async getTimeZone(): Promise<TimeZoneDto> {
    const timeZone = await this.settingsService.getTimeZone()
    return {
      timeZone,
    }
  }

  @Put('timeZone')
  setTimeZone(@Body() body: TimeZoneDto): Promise<void> {
    return this.settingsService.setTimeZone(body.timeZone)
  }
}
