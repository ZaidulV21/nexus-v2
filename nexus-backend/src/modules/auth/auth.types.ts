export interface LoginInput {
  email: string;
  password: string;
  actorType: 'ADMIN' | 'CLIENT';
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
