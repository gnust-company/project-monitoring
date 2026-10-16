// Sign in / sign up / first-run setup / workspace picker / announcements (English).
import type viAuth from '../vi/auth';

const auth: typeof viAuth = {
  auth: {
    login: {
      title: 'Sign in',
      subtitle: 'Welcome back! Enter your details to continue.',
      remember: 'Remember me',
      forgot: 'Forgot password?',
      submit: 'Sign in',
      createAccount: 'Create a new account',
      failed: 'Sign-in failed',
    },
    register: {
      title: 'Sign up',
      subtitle: 'Create an account to start using ProjectHub.',
      submit: 'Sign up',
      haveAccount: 'Already have an account? Sign in',
      failed: 'Sign-up failed',
      emailTaken: 'This email is already registered. Please sign in.',
    },
    fields: {
      name: 'Full name',
      namePlaceholder: 'Jane Doe',
      password: 'Password',
      passwordHint: 'At least 6 characters',
      confirmPassword: 'Confirm password',
      confirmPlaceholder: 'Re-enter your password',
    },
    validation: {
      emailRequired: 'Please enter your email.',
      emailInvalid: 'This email is not valid (e.g. name@company.com).',
      passwordRequired: 'Please enter your password.',
      nameRequired: 'Please enter your full name.',
      passwordMin: 'Password must be at least 6 characters.',
      passwordMismatch: 'Passwords do not match.',
    },
    invalidCredentials: 'Incorrect email or password.',
    or: 'or',
    backHome: 'Back to home',
    setup: {
      badge: 'First-run setup',
      title: 'Create the admin account',
      lead: 'There are no accounts yet. The first account will be a <strong>full system admin</strong>.',
      passwordPlaceholder: 'Password (at least 6 characters)',
      submit: 'Create & get started',
    },
  },

  selector: {
    home: 'Home',
    title: 'Choose a workspace',
    subtitle: 'Pick the organization whose projects you want to manage',
    create: 'Create a new workspace',
  },

  announcement: {
    title: 'Announcements',
    hideToday: 'Don’t show again today',
    hideWeek: 'Don’t show again this week',
  },
};

export default auth;
