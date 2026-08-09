import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { PlatformModule } from '../platform/platform.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantMiddleware } from '../common/tenant.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrmModule } from '../crm/crm.module';

@Module({
  imports: [PrismaModule, EmailModule, AuthModule, PlatformModule, CrmModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
