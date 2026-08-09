import { Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';
import { CrmModule } from '../crm/crm.module';
import { PlatformBrandingController } from './platform-branding.controller';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [EmailModule, AuthModule, CrmModule],
  controllers: [PlatformController, PlatformBrandingController],
  providers: [PlatformService],
})
export class PlatformModule {}
