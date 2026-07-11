export type OtpPurpose =
  | 'forgot_password'
  | 'change_password'
  | 'new_device'
  | 'tenant_invite';

export type OtpDelivery = 'email' | 'admin_inbox';
