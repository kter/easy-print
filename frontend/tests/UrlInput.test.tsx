import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UrlInput } from '../src/components/UrlInput';

describe('UrlInput', () => {
  it('renders URL input and submit button', () => {
    render(<UrlInput onSubmit={vi.fn()} loading={false} />);
    expect(screen.getByRole('textbox', { name: /url/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /表示/i })).toBeInTheDocument();
  });

  it('shows validation error for empty submission', () => {
    render(<UrlInput onSubmit={vi.fn()} loading={false} />);
    fireEvent.submit(screen.getByRole('button'));
    expect(screen.getByRole('alert')).toHaveTextContent('URLを入力してください');
  });

  it('shows validation error for invalid URL', () => {
    render(<UrlInput onSubmit={vi.fn()} loading={false} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'not-a-url' } });
    fireEvent.submit(screen.getByRole('button'));
    expect(screen.getByRole('alert')).toHaveTextContent('有効なURL');
  });

  it('calls onSubmit with valid URL', () => {
    const onSubmit = vi.fn();
    render(<UrlInput onSubmit={onSubmit} loading={false} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'https://example.com/article' },
    });
    fireEvent.submit(screen.getByRole('button'));
    expect(onSubmit).toHaveBeenCalledWith('https://example.com/article');
  });

  it('disables inputs when loading', () => {
    render(<UrlInput onSubmit={vi.fn()} loading={true} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveTextContent('読込中...');
  });
});
