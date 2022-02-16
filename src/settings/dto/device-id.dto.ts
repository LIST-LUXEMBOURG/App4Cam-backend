import { IsNotEmpty, Matches } from 'class-validator'

export class DeviceIdDto {
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]+$/)
  deviceId: string
}
