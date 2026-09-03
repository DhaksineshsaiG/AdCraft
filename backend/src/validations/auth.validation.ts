import { body, ValidationChain } from 'express-validator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const passwordRules = body('password')
  .trim()
  .notEmpty().withMessage('Password is required.')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
  .isLength({ max: 128 }).withMessage('Password cannot exceed 128 characters.')
  .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
  .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
  .matches(/[0-9]/).withMessage('Password must contain at least one number.')
  .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character.');

// ─── Register ─────────────────────────────────────────────────────────────────

export const validateRegister: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters.')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters.')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name may only contain letters, spaces, hyphens, and apostrophes.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail()
    .isLength({ max: 254 }).withMessage('Email cannot exceed 254 characters.'),

  passwordRules,

  body('confirmPassword')
    .trim()
    .notEmpty().withMessage('Password confirmation is required.')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match.');
      }
      return true;
    }),
];

// ─── Login ────────────────────────────────────────────────────────────────────

export const validateLogin: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .trim()
    .notEmpty().withMessage('Password is required.'),
];

export const validateForgotPassword: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail()
    .isLength({ max: 254 }).withMessage('Email cannot exceed 254 characters.'),
];

export const validateResetPassword: ValidationChain[] = [
  body('token')
    .isString().withMessage('Reset token must be a string.')
    .trim()
    .notEmpty().withMessage('Reset token is required.')
    .isLength({ max: 256 }).withMessage('Reset token is invalid.'),
  passwordRules,
  body('confirmPassword')
    .trim()
    .notEmpty().withMessage('Password confirmation is required.')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match.');
      return true;
    }),
];

export const validateGoogleAuth: ValidationChain[] = [
  body('credential')
    .isString().withMessage('Google credential must be a string.')
    .trim()
    .notEmpty().withMessage('Google credential is required.'),
];

// ─── Refresh Token ────────────────────────────────────────────────────────────

export const validateRefreshToken: ValidationChain[] = [
  body('refreshToken')
    .trim()
    .notEmpty().withMessage('Refresh token is required.')
    .isJWT().withMessage('Refresh token must be a valid JWT.'),
];

// ─── Change Password ──────────────────────────────────────────────────────────

export const validateChangePassword: ValidationChain[] = [
  body('currentPassword')
    .trim()
    .notEmpty().withMessage('Current password is required.'),

  body('newPassword')
    .trim()
    .notEmpty().withMessage('New password is required.')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
    .isLength({ max: 128 }).withMessage('New password cannot exceed 128 characters.')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter.')
    .matches(/[a-z]/).withMessage('New password must contain at least one lowercase letter.')
    .matches(/[0-9]/).withMessage('New password must contain at least one number.')
    .matches(/[^A-Za-z0-9]/).withMessage('New password must contain at least one special character.')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from your current password.');
      }
      return true;
    }),

  body('confirmNewPassword')
    .trim()
    .notEmpty().withMessage('New password confirmation is required.')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match.');
      }
      return true;
    }),
];
