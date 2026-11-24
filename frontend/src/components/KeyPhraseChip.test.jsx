import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import KeyPhraseChip from './KeyPhraseChip';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('KeyPhraseChip', () => {
  it('lets a user select the visible phrase', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<TooltipProvider><KeyPhraseChip phrase="revenue growth" onClick={onClick} /></TooltipProvider>);

    await user.click(screen.getByRole('button', { name: 'Key phrase: revenue growth' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(onClick).toHaveBeenCalledWith('revenue growth');
  });

  it('does not render a button when the phrase is blank', () => {
    render(<TooltipProvider><KeyPhraseChip phrase="  " /></TooltipProvider>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
