import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { MotionClient } from '../motion-client'
import { PropertiesService } from '../properties/properties.service'
import { SleepInteractor } from './interactors/sleep-interactor'
import { SystemTimeInteractor } from './interactors/system-time-interactor'
import { MotionTextAssembler } from './motion-text-assembler'
import { PatchableSettings, Settings, SettingsFromJsonFile } from './settings'
import { SettingsFileProvider } from './settings-file-provider'
import { TriggerSensitivityCalculator } from './trigger-sensitivity-calculator'

const SETTINGS_FILE_PATH = 'settings.json'

@Injectable()
export class SettingsService {
  private readonly deviceType: string
  private readonly logger = new Logger(SettingsService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly propertiesService: PropertiesService,
  ) {
    this.deviceType = this.configService.get<string>('deviceType')
  }

  async getAllSettings(): Promise<Settings> {
    const settingsFromFile = await SettingsFileProvider.readSettingsFile(
      SETTINGS_FILE_PATH,
    )

    const systemTime = await SystemTimeInteractor.getSystemTimeInIso8601Format()
    const timeZone = await SystemTimeInteractor.getTimeZone()

    const shotTypes = []
    let pictureQuality = 0
    let videoQuality = 0
    let triggerSensitivity = 0
    try {
      pictureQuality = await MotionClient.getPictureQuality()
      videoQuality = await MotionClient.getMovieQuality()

      const pictureOutput = await MotionClient.getPictureOutput()
      if (pictureOutput === 'best') {
        shotTypes.push('pictures')
      }
      const movieOutput = await MotionClient.getMovieOutput()
      if (movieOutput === 'on') {
        shotTypes.push('videos')
      }

      const height = await MotionClient.getHeight()
      const width = await MotionClient.getWidth()
      const threshold = await MotionClient.getThreshold()
      triggerSensitivity =
        TriggerSensitivityCalculator.convertThresholdToTriggerSensitivity(
          threshold,
          height,
          width,
        )
      this.logger.debug(
        `Calculated trigger sensitivity ${triggerSensitivity} from threshold ${threshold}, height ${height} and width ${width}`,
      )
    } catch (error) {
      if (error.config && error.config.url) {
        this.logger.error(`Could not connect to ${error.config.url}`)
      }
      if (error.code !== 'ECONNREFUSED') {
        throw error
      }
    }

    return {
      camera: {
        pictureQuality,
        shotTypes,
        videoQuality,
      },
      general: {
        ...settingsFromFile.general,
        systemTime,
        timeZone,
      },
      triggering: {
        ...settingsFromFile.triggering,
        sensitivity: triggerSensitivity,
      },
    }
  }

  async updateSettings(settings: PatchableSettings): Promise<void> {
    if (
      Object.prototype.hasOwnProperty.call(settings, 'general') &&
      Object.prototype.hasOwnProperty.call(settings.general, 'timeZone')
    ) {
      const supportedTimeZones =
        await this.propertiesService.getAvailableTimeZones()
      if (!supportedTimeZones.includes(settings.general.timeZone)) {
        throw new BadRequestException(
          `The time zone '${settings.general.timeZone}' is not supported.`,
        )
      }
    }

    if ('triggering' in settings) {
      if (
        ('sleepingTime' in settings.triggering &&
          !('wakingUpTime' in settings.triggering)) ||
        (!('sleepingTime' in settings.triggering) &&
          'wakingUpTime' in settings.triggering)
      ) {
        throw new BadRequestException(
          'Sleeping and waking up times must be given at the same time.',
        )
      }

      if (
        (settings.triggering.sleepingTime &&
          !settings.triggering.wakingUpTime) ||
        (!settings.triggering.sleepingTime && settings.triggering.wakingUpTime)
      ) {
        throw new BadRequestException(
          'Sleeping and waking up times can only be empty at the same time.',
        )
      }
    }

    if (Object.prototype.hasOwnProperty.call(settings, 'camera')) {
      if (
        Object.prototype.hasOwnProperty.call(settings.camera, 'pictureQuality')
      ) {
        await MotionClient.setPictureQuality(settings.camera.pictureQuality)
      }
      if (
        Object.prototype.hasOwnProperty.call(settings.camera, 'videoQuality')
      ) {
        await MotionClient.setMovieQuality(settings.camera.videoQuality)
      }

      if (Object.prototype.hasOwnProperty.call(settings.camera, 'shotTypes')) {
        try {
          if (settings.camera.shotTypes.includes('pictures')) {
            await MotionClient.setPictureOutput('best')
          } else {
            await MotionClient.setPictureOutput('off')
          }
          if (settings.camera.shotTypes.includes('videos')) {
            await MotionClient.setMovieOutput('on')
          } else {
            await MotionClient.setMovieOutput('off')
          }
        } catch (error) {
          if (error.config && error.config.url) {
            this.logger.error(`Could not connect to ${error.config.url}`)
          }
          if (error.code !== 'ECONNREFUSED') {
            throw error
          }
        }
      }
    }

    let isAtLeastOneJsonSettingUpdated = false
    const settingsReadFromFile = await SettingsFileProvider.readSettingsFile(
      SETTINGS_FILE_PATH,
    )

    let generalSettingsMerged = settingsReadFromFile.general
    if (Object.prototype.hasOwnProperty.call(settings, 'general')) {
      if (
        Object.prototype.hasOwnProperty.call(settings.general, 'systemTime')
      ) {
        const isRaspberryPi = this.deviceType === 'RaspberryPi'
        await SystemTimeInteractor.setSystemTimeInIso8601Format(
          settings.general.systemTime,
          isRaspberryPi,
        )
      }

      if (Object.prototype.hasOwnProperty.call(settings.general, 'timeZone')) {
        await SystemTimeInteractor.setTimeZone(settings.general.timeZone)
      }

      const newGeneralSettings: Partial<SettingsFromJsonFile['general']> = {}

      if (
        Object.prototype.hasOwnProperty.call(settings.general, 'deviceName')
      ) {
        newGeneralSettings.deviceName = settings.general.deviceName
      }

      if (Object.prototype.hasOwnProperty.call(settings.general, 'siteName')) {
        newGeneralSettings.siteName = settings.general.siteName
      }

      if (Object.keys(newGeneralSettings).length > 0) {
        // Only if there is an object property to update, do the reading and writing.

        isAtLeastOneJsonSettingUpdated = true
        generalSettingsMerged = {
          ...generalSettingsMerged,
          ...newGeneralSettings,
        }

        let timeZone
        if (
          Object.prototype.hasOwnProperty.call(settings.general, 'timeZone')
        ) {
          timeZone = settings.general.timeZone
        } else {
          timeZone = await SystemTimeInteractor.getTimeZone()
        }
        const filename = MotionTextAssembler.createFilename(
          generalSettingsMerged.siteName,
          generalSettingsMerged.deviceName,
          timeZone,
        )
        await MotionClient.setFilename(filename)
        if (
          Object.prototype.hasOwnProperty.call(
            settings.general,
            'deviceName',
          ) ||
          Object.prototype.hasOwnProperty.call(settings.general, 'siteName')
        ) {
          const imageText = MotionTextAssembler.createImageText(
            generalSettingsMerged.siteName,
            generalSettingsMerged.deviceName,
          )
          await MotionClient.setLeftTextOnImage(imageText)
        }
      }
    }

    let triggeringSettingsMerged = settingsReadFromFile.triggering
    if (Object.prototype.hasOwnProperty.call(settings, 'triggering')) {
      const newTriggeringSettings: Partial<SettingsFromJsonFile['triggering']> =
        {}

      if (
        Object.prototype.hasOwnProperty.call(
          settings.triggering,
          'sleepingTime',
        )
      ) {
        newTriggeringSettings.sleepingTime = settings.triggering.sleepingTime
      }

      if (
        Object.prototype.hasOwnProperty.call(
          settings.triggering,
          'wakingUpTime',
        )
      ) {
        newTriggeringSettings.wakingUpTime = settings.triggering.wakingUpTime
      }

      if (Object.keys(newTriggeringSettings).length > 0) {
        // Only if there is an object property to update, do the reading and writing.

        isAtLeastOneJsonSettingUpdated = true
        triggeringSettingsMerged = {
          ...triggeringSettingsMerged,
          ...newTriggeringSettings,
        }
      }

      if (
        Object.prototype.hasOwnProperty.call(settings.triggering, 'sensitivity')
      ) {
        try {
          const height = await MotionClient.getHeight()
          const width = await MotionClient.getWidth()
          const threshold =
            TriggerSensitivityCalculator.convertTriggerSensitivityToThreshold(
              settings.triggering.sensitivity,
              height,
              width,
            )
          this.logger.debug(
            `Calculated threshold ${threshold} from trigger sensitivity ${settings.triggering.sensitivity}, height ${height} and width ${width}`,
          )
          await MotionClient.setThreshold(threshold)
        } catch (error) {
          if (error.config && error.config.url) {
            this.logger.error(`Could not connect to ${error.config.url}`)
          }
          if (error.code !== 'ECONNREFUSED') {
            throw error
          }
        }
      }
    }

    if (isAtLeastOneJsonSettingUpdated) {
      const settingsToUpdate = {
        general: generalSettingsMerged,
        triggering: triggeringSettingsMerged,
      }
      await SettingsFileProvider.writeSettingsToFile(
        settingsToUpdate,
        SETTINGS_FILE_PATH,
      )
    }
  }

  async updateAllSettings(settings: Settings): Promise<void> {
    const supportedTimeZones =
      await this.propertiesService.getAvailableTimeZones()
    if (!supportedTimeZones.includes(settings.general.timeZone)) {
      throw new BadRequestException(
        `The time zone '${settings.general.timeZone}' is not supported.`,
      )
    }

    if (
      (settings.triggering.sleepingTime && !settings.triggering.wakingUpTime) ||
      (!settings.triggering.sleepingTime && settings.triggering.wakingUpTime)
    ) {
      throw new BadRequestException(
        'Sleeping and waking up times can only be empty at the same time.',
      )
    }

    const isRaspberryPi = this.deviceType === 'RaspberryPi'
    await SystemTimeInteractor.setSystemTimeInIso8601Format(
      settings.general.systemTime,
      isRaspberryPi,
    )

    await SystemTimeInteractor.setTimeZone(settings.general.timeZone)

    if (Object.prototype.hasOwnProperty.call(settings.camera, 'shotTypes')) {
      try {
        if (settings.camera.shotTypes.includes('pictures')) {
          await MotionClient.setPictureOutput('best')
        } else {
          await MotionClient.setPictureOutput('off')
        }
        if (settings.camera.shotTypes.includes('videos')) {
          await MotionClient.setMovieOutput('on')
        } else {
          await MotionClient.setMovieOutput('off')
        }
      } catch (error) {
        if (error.config && error.config.url) {
          this.logger.error(`Could not connect to ${error.config.url}`)
        }
        if (error.code !== 'ECONNREFUSED') {
          throw error
        }
      }
    }

    try {
      await MotionClient.setPictureQuality(settings.camera.pictureQuality)
      await MotionClient.setMovieQuality(settings.camera.videoQuality)

      const height = await MotionClient.getHeight()
      const width = await MotionClient.getWidth()
      const threshold =
        TriggerSensitivityCalculator.convertTriggerSensitivityToThreshold(
          settings.triggering.sensitivity,
          height,
          width,
        )
      this.logger.debug(
        `Calculated threshold ${threshold} from trigger sensitivity ${settings.triggering.sensitivity}, height ${height} and width ${width}`,
      )
      await MotionClient.setThreshold(threshold)
    } catch (error) {
      if (error.config && error.config.url) {
        this.logger.error(`Could not connect to ${error.config.url}`)
      }
      if (error.code !== 'ECONNREFUSED') {
        throw error
      }
    }

    const settingsToWriteFile: SettingsFromJsonFile = {
      general: {
        deviceName: settings.general.deviceName,
        siteName: settings.general.siteName,
      },
      triggering: {
        sleepingTime: settings.triggering.sleepingTime,
        wakingUpTime: settings.triggering.wakingUpTime,
      },
    }

    await SettingsFileProvider.writeSettingsToFile(
      settingsToWriteFile,
      SETTINGS_FILE_PATH,
    )

    const filename = MotionTextAssembler.createFilename(
      settings.general.siteName,
      settings.general.deviceName,
      settings.general.timeZone,
    )
    await MotionClient.setFilename(filename)

    const imageText = MotionTextAssembler.createImageText(
      settings.general.siteName,
      settings.general.deviceName,
    )
    await MotionClient.setLeftTextOnImage(imageText)

    await SystemTimeInteractor.setTimeZone(settings.general.timeZone)
  }

  async getSiteName(): Promise<string> {
    const settings = await SettingsFileProvider.readSettingsFile(
      SETTINGS_FILE_PATH,
    )
    return settings.general.siteName
  }

  async setSiteName(siteName: string): Promise<void> {
    const settings = await SettingsFileProvider.readSettingsFile(
      SETTINGS_FILE_PATH,
    )
    settings.general.siteName = siteName
    await SettingsFileProvider.writeSettingsToFile(settings, SETTINGS_FILE_PATH)
    const timeZone = await SystemTimeInteractor.getTimeZone()
    const filename = MotionTextAssembler.createFilename(
      siteName,
      settings.general.deviceName,
      timeZone,
    )
    await MotionClient.setFilename(filename)
    const imageText = MotionTextAssembler.createImageText(
      siteName,
      settings.general.deviceName,
    )
    await MotionClient.setLeftTextOnImage(imageText)
  }

  async getDeviceName(): Promise<string> {
    const settings = await SettingsFileProvider.readSettingsFile(
      SETTINGS_FILE_PATH,
    )
    return settings.general.deviceName
  }

  async setDeviceName(deviceName: string): Promise<void> {
    const settings = await SettingsFileProvider.readSettingsFile(
      SETTINGS_FILE_PATH,
    )
    settings.general.deviceName = deviceName
    await SettingsFileProvider.writeSettingsToFile(settings, SETTINGS_FILE_PATH)
    const timeZone = await SystemTimeInteractor.getTimeZone()
    const filename = MotionTextAssembler.createFilename(
      settings.general.siteName,
      deviceName,
      timeZone,
    )
    await MotionClient.setFilename(filename)
    const imageText = MotionTextAssembler.createImageText(
      settings.general.siteName,
      deviceName,
    )
    await MotionClient.setLeftTextOnImage(imageText)
  }

  async getSystemTime(): Promise<string> {
    const time = await SystemTimeInteractor.getSystemTimeInIso8601Format()
    return time
  }

  async setSystemTime(systemTime: string): Promise<void> {
    const isRaspberryPi = this.deviceType === 'RaspberryPi'
    await SystemTimeInteractor.setSystemTimeInIso8601Format(
      systemTime,
      isRaspberryPi,
    )
  }

  async getTimeZone(): Promise<string> {
    const timeZone = await SystemTimeInteractor.getTimeZone()
    return timeZone
  }

  async setTimeZone(timeZone: string): Promise<void> {
    const supportedTimeZones =
      await this.propertiesService.getAvailableTimeZones()
    if (!supportedTimeZones.includes(timeZone)) {
      throw new BadRequestException(
        `The time zone '${timeZone}' is not supported.`,
      )
    }
    await SystemTimeInteractor.setTimeZone(timeZone)
    const settings = await SettingsFileProvider.readSettingsFile(
      SETTINGS_FILE_PATH,
    )
    const filename = MotionTextAssembler.createFilename(
      settings.general.siteName,
      settings.general.deviceName,
      timeZone,
    )
    await MotionClient.setFilename(filename)
  }

  async getShotsFolder(): Promise<string> {
    const shotsFolder = await MotionClient.getTargetDir()
    return shotsFolder
  }

  async setShotsFolder(path: string): Promise<void> {
    await MotionClient.setTargetDir(path)
  }

  async getSleepingTime(): Promise<string> {
    const settings = await SettingsFileProvider.readSettingsFile(
      SETTINGS_FILE_PATH,
    )
    return settings.triggering.sleepingTime
  }

  async getWakingUpTime(): Promise<string> {
    const settings = await SettingsFileProvider.readSettingsFile(
      SETTINGS_FILE_PATH,
    )
    return settings.triggering.wakingUpTime
  }

  @Cron('* * * * *') // every 1 minute
  async sleepWhenItIsTime() {
    this.logger.log('Cron job to go to sleep when it is time triggered...')
    const sleepingTime = await this.getSleepingTime()
    if (!sleepingTime) {
      this.logger.log('No sleeping time set.')
      return
    }
    const sleepingTimeHours = parseInt(sleepingTime.substring(0, 2))
    const sleepingTimeMinutes = parseInt(sleepingTime.substring(3))
    const now = new Date()
    if (
      sleepingTimeHours === now.getHours() &&
      sleepingTimeMinutes === now.getMinutes()
    ) {
      this.logger.log('It is time to sleep. Good night!')
      const wakingUpTime = await this.getWakingUpTime()
      if (!wakingUpTime) {
        this.logger.error('No waking up time set, but a sleeping time is set.')
      }
      SleepInteractor.triggerSleeping(wakingUpTime)
    }
  }
}
