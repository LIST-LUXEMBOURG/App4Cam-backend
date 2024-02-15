// © 2022-2024 Luxembourg Institute of Science and Technology
import { Module } from '@nestjs/common'
import { FilesModule } from '../files/files.module'
import { SnapshotsController } from './snapshots.controller'
import { SnapshotsService } from './snapshots.service'

@Module({
  controllers: [SnapshotsController],
  providers: [SnapshotsService],
  imports: [FilesModule],
})
export class SnapshotsModule {}
