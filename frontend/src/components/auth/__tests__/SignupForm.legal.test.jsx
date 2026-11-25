import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const registerMock = vi.fn();
vi.mock('@/services/authService', () => ({
  default: { register: (...args) => registerMock(...args) },
}));

import { SignupForm } from '../SignupForm';

const fillValidForm = (container) => {
  const set = (name, value) => fireEvent.change(container.querySelector(`input[name="${name}"]`), { target: { name, value } });
  set('username', 'legal_tester');
  set('email', 'legal.tester@example.com');
  set('password', 'StrongPass123!');
  set('password2', 'StrongPass123!');
};

const renderForm = (props = {}) =>
  render(
    <MemoryRouter>
      <SignupForm {...props} />
    </MemoryRouter>
  );

describe('SignupForm legal acknowledgements', () => {
  beforeEach(() => {
    registerMock.mockReset();
  });

  it('renders two separate, unticked legal controls', () => {
    const { container } = renderForm();
    const terms = container.querySelector('#accept-terms');
    const privacy = container.querySelector('#acknowledge-privacy');
    expect(terms.type).toBe('checkbox');
    expect(privacy.type).toBe('checkbox');
    expect(terms.checked).toBe(false);
    expect(privacy.checked).toBe(false);
  });

  it('keeps submit disabled until both boxes are ticked, and sends both flags', async () => {
    registerMock.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    const { container, getByRole } = renderForm({ onSuccess });
    fillValidForm(container);

    const submit = getByRole('button', { name: 'Create Account' });
    expect(submit.disabled).toBe(true);

    fireEvent.click(container.querySelector('#accept-terms'));
    expect(submit.disabled).toBe(true); // Terms alone is not enough

    fireEvent.click(container.querySelector('#acknowledge-privacy'));
    expect(submit.disabled).toBe(false);

    fireEvent.click(submit);
    await waitFor(() => expect(registerMock).toHaveBeenCalledTimes(1));
    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'legal_tester',
        acceptTerms: true,
        acknowledgePrivacyNotice: true,
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('legal.tester@example.com'));
  });

  it('does not submit when only the privacy box is ticked', () => {
    const { container, getByRole } = renderForm();
    fillValidForm(container);
    fireEvent.click(container.querySelector('#acknowledge-privacy'));
    const submit = getByRole('button', { name: 'Create Account' });
    expect(submit.disabled).toBe(true);
    fireEvent.submit(container.querySelector('form'));
    expect(registerMock).not.toHaveBeenCalled();
  });
});
