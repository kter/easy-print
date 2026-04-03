import { useState, type FormEvent } from 'react';
import './UrlInput.css';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  loading: boolean;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function UrlInput({ onSubmit, loading }: UrlInputProps) {
  const [value, setValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();

    if (!trimmed) {
      setValidationError('URLを入力してください');
      return;
    }

    if (!isValidUrl(trimmed)) {
      setValidationError('有効なURL (http:// または https://) を入力してください');
      return;
    }

    setValidationError(null);
    onSubmit(trimmed);
  };

  return (
    <form className="url-input-form" onSubmit={handleSubmit} noValidate>
      <div className="url-input-wrapper">
        <input
          type="url"
          className="url-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://example.com/article"
          disabled={loading}
          aria-label="URL"
          aria-describedby={validationError ? 'url-error' : undefined}
        />
        <button type="submit" className="url-submit-btn" disabled={loading || !value.trim()}>
          {loading ? '読込中...' : '表示'}
        </button>
      </div>
      {validationError && (
        <p id="url-error" className="url-validation-error" role="alert">
          {validationError}
        </p>
      )}
    </form>
  );
}
