import { exec as execSync } from 'child_process'
import { lstat, readdir } from 'fs/promises'
import path = require('path')
import { promisify } from 'util'
import { LightType } from './settings/settings'

const exec = promisify(execSync)

const MEDIA_BASE_PATH = '/media'

export class InitialisationInteractor {
  private static isWindows(): boolean {
    return process.platform === 'win32'
  }

  static async getNewestMediaPath() {
    const elements = await readdir(MEDIA_BASE_PATH)
    const elementPromises = elements.map(async (element) => {
      const elementPath = path.join(MEDIA_BASE_PATH, element)
      const stats = await lstat(elementPath)
      return {
        path: elementPath,
        stats,
      }
    })
    const elementsWithStats = await Promise.all(elementPromises)
    return elementsWithStats
      .filter((element) => element.stats.isDirectory())
      .sort((a, b) => {
        return b.stats.mtime.getTime() - a.stats.mtime.getTime()
      })
      .map((folder) => {
        return folder.path
      })
      .at(0)
  }

  static async resetLights(
    serviceName: string,
    deviceType: string,
    lightType: LightType,
  ): Promise<void> {
    if (this.isWindows()) {
      // The following command does not exist on Windows machines.
      return Promise.resolve()
    }
    const { stderr } = await exec(
      `sudo /home/app4cam/${serviceName}/scripts/switch-off-recording-leds.sh ${deviceType} ${lightType}`,
    )
    if (stderr) {
      throw new Error(stderr)
    }
  }
}
