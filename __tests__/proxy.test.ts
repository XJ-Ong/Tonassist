import { describe, it, expect } from 'vitest';
import { isPublicRoute } from '../proxy';

describe('isPublicRoute', () => {
  it('allows root path', () => {
    expect(isPublicRoute('/')).toBe(true);
  });

  it('allows /api/auth', () => {
    expect(isPublicRoute('/api/auth')).toBe(true);
  });

  it('allows /api/auth/* sub-routes', () => {
    expect(isPublicRoute('/api/auth/login')).toBe(true);
    expect(isPublicRoute('/api/auth/logout')).toBe(true);
    expect(isPublicRoute('/api/auth/callback')).toBe(true);
  });

  it('requires auth for /dashboard', () => {
    expect(isPublicRoute('/dashboard')).toBe(false);
  });

  it('requires auth for /api/members', () => {
    expect(isPublicRoute('/api/members')).toBe(false);
  });

  it('requires auth for unknown paths', () => {
    expect(isPublicRoute('/settings')).toBe(false);
    expect(isPublicRoute('/api/tools')).toBe(false);
  });
});
