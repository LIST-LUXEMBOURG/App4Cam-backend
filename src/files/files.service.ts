import { Injectable, Logger } from '@nestjs/common'
import { File } from './entities/file.entity'
import { lstat, readdir } from 'fs/promises'
import path = require('path')
import { ConfigService } from '@nestjs/config'
import { ArchiveFileManager } from './archive-file-manager'
import { FileHandler } from './file-handler'
import { Cron } from '@nestjs/schedule'
import { SettingsService } from '../settings/settings.service'

const ARCHIVE_FOLDER_PATH = 'temp'

@Injectable()
export class FilesService {
  private readonly fileFolderPath: string
  private readonly logger = new Logger(FilesService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
  ) {
    this.fileFolderPath = this.configService.get<string>('filesFolderPath')
  }

  async findAll(): Promise<File[]> {
    const elements = await readdir(this.fileFolderPath)
    const elementPromises = elements.map(async (elementName) => {
      const filePath = path.join(this.fileFolderPath, elementName)
      const stats = await lstat(filePath)
      return {
        name: elementName,
        stats,
      }
    })
    const elementsWithStats = await Promise.all(elementPromises)
    return elementsWithStats
      .filter((element) => element.stats.isFile())
      .map((file) => {
        return {
          name: file.name,
          creationTime: file.stats.birthtime,
        }
      })
  }

  getStreamableFile(filename: string) {
    const filePath = path.join(this.fileFolderPath, filename)
    return FileHandler.createStreamWithContentType(filePath)
  }

  async getStreamableFiles(filenames: string[]) {
    const now = new Date()
    const settings = await this.settingsService.getAllSettings()
    const archiveFilename = ArchiveFileManager.createArchiveFilename(
      now,
      settings.deviceId,
      settings.siteName,
    )
    const archiveFilePath = path.join(ARCHIVE_FOLDER_PATH, archiveFilename)
    const filePaths = filenames.map((filename) =>
      path.join(this.fileFolderPath, filename),
    )
    ArchiveFileManager.createArchive(archiveFilePath, filePaths)
    const streamableFile =
      FileHandler.createStreamWithContentType(archiveFilePath)
    return {
      filename: archiveFilename,
      ...streamableFile,
    }
  }

  @Cron('*/5 * * * *') // every 5 minutes
  removeOldArchives() {
    this.logger.log('Cron job to delete old archives triggered...')
    ArchiveFileManager.removeOldFiles(ARCHIVE_FOLDER_PATH)
  }

  // remove(id: number) {
  //   return `This action removes a #${id} file`
  // }
}
