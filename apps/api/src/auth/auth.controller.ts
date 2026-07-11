import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';
import type { Request } from 'express';

import { CurrentUser, Public, type AuthUserPayload } from '../common/decorators';
import { resolveTenantSlugFromRequest } from '../common/tenant.util';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsString()
  @MinLength(1)
  deviceId!: string;
}

class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

class ResendOtpDto {
  @IsUUID()
  challengeId!: string;
}

class ForgotPasswordVerifyCodeDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  code!: string;
}

class ForgotPasswordResetDto {
  @IsString()
  @MinLength(1)
  resetToken!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

class LoginVerifyDeviceDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  deviceId!: string;

  @IsString()
  @MinLength(1)
  code!: string;
}

class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

class ConfirmChangePasswordDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

class VerifyDeviceDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  deviceId!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: LoginDto, @Req() req: Request) {
    const tenantSlug = resolveTenantSlugFromRequest(req);
    return this.auth.login(body.email, body.password, tenantSlug, body.deviceId);
  }

  @Public()
  @Post('login/verify-device')
  loginVerifyDevice(@Body() body: LoginVerifyDeviceDto, @Req() req: Request) {
    const tenantSlug = resolveTenantSlugFromRequest(req);
    return this.auth.loginVerifyDevice(body.email, body.deviceId, body.code, tenantSlug);
  }

  @Public()
  @Post('logout')
  logout() {
    return { message: 'Logged out' };
  }

  @Get('session')
  session(@CurrentUser() user: AuthUserPayload) {
    return this.auth.getSession(user.userId);
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto, @Req() req: Request) {
    const tenantSlug = resolveTenantSlugFromRequest(req);
    return this.auth.forgotPassword(body.email, tenantSlug);
  }

  @Public()
  @Post('forgot-password/resend')
  resendForgotPassword(@Body() body: ResendOtpDto) {
    return this.auth.resendOtp(body.challengeId);
  }

  @Public()
  @Post('forgot-password/verify-code')
  verifyForgotPasswordCode(@Body() body: ForgotPasswordVerifyCodeDto) {
    return this.auth.verifyForgotPasswordCode(body.email, body.code);
  }

  @Public()
  @Post('forgot-password/reset')
  resetPasswordWithToken(@Body() body: ForgotPasswordResetDto) {
    return this.auth.resetPasswordWithToken(body.resetToken, body.newPassword);
  }

  @Public()
  @Post('otp/resend')
  resendOtp(@Body() body: ResendOtpDto) {
    return this.auth.resendOtp(body.challengeId);
  }

  /** @deprecated Use verify-code + reset flow */
  @Public()
  @Post('forgot-password/verify')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body.email, body.code, body.newPassword);
  }

  @Post('change-password')
  changePassword(@CurrentUser() user: AuthUserPayload, @Body() body: ChangePasswordDto) {
    return this.auth.changePassword(user.userId, body.currentPassword, body.newPassword);
  }

  @Post('change-password/confirm')
  confirmChangePassword(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: ConfirmChangePasswordDto,
  ) {
    return this.auth.confirmChangePassword(user.userId, body.code, body.newPassword);
  }

  @Post('verify-device')
  verifyDevice(@CurrentUser() user: AuthUserPayload, @Body() body: VerifyDeviceDto) {
    return this.auth.verifyDevice(user.userId, body.deviceId, body.code, body.email);
  }

  @Post('verify-device/request')
  requestDeviceOtp(@CurrentUser() user: AuthUserPayload) {
    return this.auth.requestDeviceOtp(user.userId);
  }

  @Public()
  @Get('otp-copy')
  otpCopy(@Query('token') token: string) {
    return this.auth.resolveOtpCopyToken(token);
  }

  @Get('otp-inbox')
  otpInbox(@CurrentUser() user: AuthUserPayload) {
    if (user.systemRole !== 'org_admin') {
      throw new ForbiddenException('Organization admin only');
    }
    if (!user.organizationId) {
      return [];
    }
    return this.auth.listOtpInbox(user.organizationId);
  }
}
