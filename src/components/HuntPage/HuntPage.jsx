import { useMemo, useState } from 'react';
import { Clipboard, ClipboardCheck, Sparkles } from 'lucide-react';
import { generateHuntInsights, getHuntConfigError } from '../../utils/huntAi';
import './HuntPage.css';

const MIN_TEXT_LENGTH = 40;

export function HuntPage() {
  const [postText, setPostText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const configError = useMemo(() => getHuntConfigError(), []);

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanText = postText.trim();
    if (cleanText.length < MIN_TEXT_LENGTH) {
      setError(`Please paste at least ${MIN_TEXT_LENGTH} characters from the job post.`);
      return;
    }

    setLoading(true);
    setError('');
    setCopied(false);
    try {
      const data = await generateHuntInsights(cleanText);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyDraft() {
    if (!result?.draftText) return;
    try {
      await navigator.clipboard.writeText(result.draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      setError('Could not copy draft. Please copy manually.');
    }
  }

  return (
    <div className="page hunt-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hunt</h1>
          <p className="hunt-page__subtitle">
            Paste a job post/circular and get AI-powered summary, suggestions, and one application draft.
          </p>
        </div>
      </div>

      {configError && (
        <div className="hunt-page__alert hunt-page__alert--warning">
          {configError}
        </div>
      )}

      <form className="hunt-card hunt-form" onSubmit={handleSubmit}>
        <label htmlFor="hunt-post" className="hunt-form__label">Job Post / Circular</label>
        <textarea
          id="hunt-post"
          className="hunt-form__textarea"
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="Paste the full job post here..."
          rows={10}
        />
        <div className="hunt-form__footer">
          <span className="hunt-form__hint">Tip: include skills, role scope, and application instructions.</span>
          <button type="submit" className="btn btn-primary" disabled={loading || Boolean(configError)}>
            <Sparkles size={16} />
            {loading ? 'Analyzing...' : 'Generate Insights'}
          </button>
        </div>
      </form>

      {error && <div className="hunt-page__alert hunt-page__alert--error">{error}</div>}

      {result && (
        <section className="hunt-results">
          <article className="hunt-card">
            <h2 className="hunt-card__title">Summary</h2>
            <p className="hunt-card__text">{result.summary}</p>
          </article>

          <article className="hunt-card">
            <h2 className="hunt-card__title">Suggestions</h2>
            <ul className="hunt-card__list">
              {result.suggestions.map((item, idx) => (
                <li key={`${item}-${idx}`}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="hunt-card">
            <div className="hunt-card__title-row">
              <h2 className="hunt-card__title">Draft ({result.draftTypeLabel})</h2>
              <button type="button" className="btn btn-secondary btn-small" onClick={handleCopyDraft}>
                {copied ? <ClipboardCheck size={14} /> : <Clipboard size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="hunt-card__draft">{result.draftText}</pre>
          </article>
        </section>
      )}
    </div>
  );
}
