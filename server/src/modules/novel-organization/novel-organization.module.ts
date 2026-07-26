import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NovelOrganizationController } from './novel-organization.controller';
import { NovelOrganizationService } from './novel-organization.service';
import {
  NovelOrganization,
  NovelOrganizationSchema,
} from './schemas/novel-organization.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NovelOrganization.name, schema: NovelOrganizationSchema },
    ]),
  ],
  controllers: [NovelOrganizationController],
  providers: [NovelOrganizationService],
  exports: [NovelOrganizationService],
})
export class NovelOrganizationModule {}
