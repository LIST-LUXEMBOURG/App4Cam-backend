import { Type } from 'class-transformer'
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

type ShotType = 'pictures' | 'videos'

class CameraSettingsPatchDto {
  @IsArray()
  @Matches(/^(pictures|videos)$/, { each: true })
  @IsOptional()
  shotTypes?: ShotType[]
}

class GeneralSettingsPatchDto {
  @IsOptional()
  @Matches(/^[a-zA-Z0-9-]+$/)
  deviceName?: string

  @IsOptional()
  @Matches(/^[a-zA-Z0-9-]*$/)
  siteName?: string

  @IsOptional()
  @IsDateString()
  systemTime?: string

  @IsOptional()
  @IsString()
  timeZone?: string
}

class TriggeringSettingsPatchDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10)
  sensitivity?: number
}

export class SettingsPatchDto {
  @IsObject()
  @IsOptional()
  @Type(() => CameraSettingsPatchDto)
  @ValidateNested()
  camera?: CameraSettingsPatchDto

  @IsObject()
  @IsOptional()
  @Type(() => GeneralSettingsPatchDto)
  @ValidateNested()
  general?: GeneralSettingsPatchDto

  @IsObject()
  @IsOptional()
  @Type(() => TriggeringSettingsPatchDto)
  @ValidateNested()
  triggering?: TriggeringSettingsPatchDto
}

class CameraSettingsPutDto {
  @IsArray()
  @Matches(/^(pictures|videos)$/, { each: true })
  shotTypes: ShotType[]
}

class GeneralSettingsPutDto {
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9-]+$/)
  deviceName: string

  @Matches(/^[a-zA-Z0-9-]*$/)
  siteName: string

  @IsNotEmpty()
  @IsDateString()
  systemTime: string

  @IsNotEmpty()
  @IsString()
  timeZone: string
}

class TriggeringSettingsPutDto {
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10)
  sensitivity: number
}

export class SettingsPutDto {
  @IsObject()
  @IsNotEmpty()
  @IsNotEmptyObject()
  @Type(() => CameraSettingsPutDto)
  @ValidateNested()
  camera: CameraSettingsPutDto

  @IsObject()
  @IsNotEmpty()
  @IsNotEmptyObject()
  @Type(() => GeneralSettingsPutDto)
  @ValidateNested()
  general: GeneralSettingsPutDto

  @IsObject()
  @IsNotEmpty()
  @IsNotEmptyObject()
  @Type(() => TriggeringSettingsPutDto)
  @ValidateNested()
  triggering: TriggeringSettingsPutDto
}
