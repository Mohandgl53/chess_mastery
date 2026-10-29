import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AuthProvider } from '../../auth/AuthProvider';

describe('GoogleSignInButton component', () => {
  const originalGoogle = (window as any).google;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).google;
  });

  afterEach(() => {
    (window as any).google = originalGoogle;
  });

  it('renders fallback button when Google GIS is not yet loaded', () => {
    const onError = vi.fn();
    const onSuccess = vi.fn();

    render(
      <AuthProvider>
        <GoogleSignInButton onSuccess={onSuccess} onError={onError} text="signin_with" />
      </AuthProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDefined();
    expect(button.textContent).toContain('Google');
  });

  it('reports an error if fallback button is clicked when GIS is offline/blocked', () => {
    const onError = vi.fn();
    const onSuccess = vi.fn();

    render(
      <AuthProvider>
        <GoogleSignInButton onSuccess={onSuccess} onError={onError} text="signin_with" />
      </AuthProvider>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('Google Sign-In')
    );
  });

  it('initializes GIS and calls renderButton when window.google is ready', async () => {
    const mockInitialize = vi.fn();
    const mockRenderButton = vi.fn();
    const mockPrompt = vi.fn();

    (window as any).google = {
      accounts: {
        id: {
          initialize: mockInitialize,
          renderButton: mockRenderButton,
          prompt: mockPrompt,
        },
      },
    };

    const onError = vi.fn();
    const onSuccess = vi.fn();

    render(
      <AuthProvider>
        <GoogleSignInButton onSuccess={onSuccess} onError={onError} text="signin_with" />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalled();
      expect(mockRenderButton).toHaveBeenCalled();
    });

    const initCall = mockInitialize.mock.calls[0][0];
    expect(initCall).toHaveProperty('client_id');
    expect(typeof initCall.callback).toBe('function');
  });
});

