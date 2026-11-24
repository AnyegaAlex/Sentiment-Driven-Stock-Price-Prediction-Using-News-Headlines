import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WelcomeStep from './WelcomeStep';
import PersonaSelection from './PersonaSelection';
import CompletionStep from './CompletionStep';

describe('onboarding step feedback', () => {
  it('clearly labels and disables the action that skips all setup', () => {
    render(<WelcomeStep onNext={vi.fn()} onSkip={vi.fn()} isLoading />);

    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Skip setup' })).toBeDisabled();
  });

  it('disables persona actions while the selection is being saved', () => {
    render(
      <PersonaSelection
        onSelect={vi.fn()}
        onSkip={vi.fn()}
        selectedPersona="trader"
        isLoading
      />
    );

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Skip setup' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Trader/ })).toBeDisabled();
  });

  it('labels the distinct action for skipping only the tour', () => {
    render(<CompletionStep onFinish={vi.fn()} onSkip={vi.fn()} isLoading />);

    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Skip tour' })).toBeDisabled();
  });
});
