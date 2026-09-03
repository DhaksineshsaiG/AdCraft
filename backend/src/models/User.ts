export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  VIEWER = 'viewer',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  GITHUB = 'github',
}

export interface IRefreshToken {
  token: string;
  expiresAt: Date;
  createdByIp: string;
  isRevoked: boolean;
  revokedAt?: Date;
}

export interface INotificationPreferences {
  emailOnPosterGenerated: boolean;
  emailOnExportReady: boolean;
  emailOnStoreConnected: boolean;
  emailMarketing: boolean;
}

export interface IOAuthProvider {
  provider: AuthProvider;
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

export interface IUser {
  _id: string;
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpiresAt?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpiresAt?: Date;
  refreshTokens: IRefreshToken[];
  oauthProviders: IOAuthProvider[];
  notificationPreferences: INotificationPreferences;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  loginCount: number;
  stores: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type IUserDocument = IUser;
export type SafeUser = Omit<
  IUser,
  | 'password'
  | 'refreshTokens'
  | 'emailVerificationToken'
  | 'emailVerificationTokenExpiresAt'
  | 'passwordResetToken'
  | 'passwordResetTokenExpiresAt'
>;
