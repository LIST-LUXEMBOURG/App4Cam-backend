// © 2022-2024 Luxembourg Institute of Science and Technology
import { createReadStream } from 'fs'
import path = require('path')
import { MimeTypeDeterminer } from './mime-type-determiner'

export class FileHandler {
  static createStreamWithContentType(filePath: string) {
    const fileExtension = path.extname(filePath)
    const contentType = MimeTypeDeterminer.getContentType(fileExtension)
    const stream = createReadStream(filePath)
    return {
      contentType,
      stream,
    }
  }
}
