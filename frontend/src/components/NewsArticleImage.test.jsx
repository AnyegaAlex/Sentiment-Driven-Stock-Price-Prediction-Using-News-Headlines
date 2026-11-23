import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NewsArticleImage from './NewsArticleImage';

describe('NewsArticleImage', () => {
  it('shows the article image when a provider URL is available', () => {
    render(<NewsArticleImage src="https://news.example/image.jpg" title="Company update" />);

    expect(screen.getByRole('img', { name: 'Image for Company update' })).toHaveAttribute(
      'src',
      'https://news.example/image.jpg'
    );
  });

  it('shows an in-app fallback when a provider image fails to load', () => {
    render(<NewsArticleImage src="https://news.example/missing.jpg" title="Company update" />);

    fireEvent.error(screen.getByRole('img', { name: 'Image for Company update' }));

    expect(screen.getByTestId('news-image-fallback')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the fallback when an article has no image URL', () => {
    render(<NewsArticleImage title="Company update" />);

    expect(screen.getByTestId('news-image-fallback')).toBeInTheDocument();
  });
});
