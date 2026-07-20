import { api } from './api';

export const authService = {
  register: (username, email, password, password2) =>
    api.post('/auth/register/', { username, email, password, password2 }),

  login: (username, password) =>
    api.post('/auth/login/', { username, password }),

  verifyEmail: (token, uid) =>
    api.get(`/auth/verify-email/?token=${token}&uid=${uid}`),

  resendVerification: () =>
    api.post('/auth/resend-verification/'),

  requestPasswordReset: (email) =>
    api.post('/auth/password-reset/', { email }),

  confirmPasswordReset: (token, uid, password, password2) =>
    api.post(`/auth/password-reset/confirm/?uid=${uid}`, { token, password, password2 }),

  getProfile: () =>
    api.get('/auth/profile/'),

  updateProfile: (data) =>
    api.patch('/auth/profile/update/', data),

  changePassword: (oldPassword, newPassword, newPassword2) =>
    api.post('/auth/change-password/', { old_password: oldPassword, new_password: newPassword, new_password2: newPassword2 }),

  generateApiKey: () =>
    api.post('/auth/api-key/generate/'),
};