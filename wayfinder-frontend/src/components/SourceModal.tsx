import { useEffect, useState } from "react";
import type { Citation, CityCompareResponse } from "../types/api";
import { fetchCityComparison } from "../lib/api";

interface Props {
  citation: Citation | null;
  onClose: () => void;
}

export default function SourceModal({ citation, onClose }: Props) {
  const [comparison, setComparison] = useState<CityCompareResponse | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  // Escape key closes the modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (citation) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [citation, onClose]);

  // Reset comparison state whenever a new citation opens
  useEffect(() => {
    setComparison(null);
    setShowCompare(false);
    setCompareError(null);
  }, [citation?.city]);

  if (!citation) return null;

  async function handleCompareClick() {
    if (!citation) return;
    setShowCompare(true);
    if (comparison) return; // already fetched, just toggle the view
    setLoadingCompare(true);
    setCompareError(null);
    try {
      const data = await fetchCityComparison(citation.city);
      setComparison(data);
    } catch (e) {
      setCompareError(e instanceof Error ? e.message : "Failed to load comparison.");
    } finally {
      setLoadingCompare(false);
    }
  }

  return (
    <div className="modal-bg open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${showCompare ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-city">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h3 id="modal-city">{citation.city}</h3>
        <div className="submeta">
          {citation.source === "gemini" ? "Gemini" : "Perplexity"}
          {citation.score !== undefined && ` · ${Math.round(citation.score * 100)}% match`}
        </div>

        {!showCompare && (
          <>
            <div className="src-text">{citation.full_text}</div>
            <button className="compare-btn" onClick={handleCompareClick}>
              How do the LLMs see this city? →
            </button>
          </>
        )}

        {showCompare && (
          <div className="compare-pane">
            {loadingCompare && <div className="compare-loading">Loading comparison…</div>}
            {compareError && <div className="compare-error">{compareError}</div>}
            {comparison && (
              <>
                <div className="compare-summary">
                  <span className="similarity-score">
                    Similarity: {Math.round(comparison.similarity * 100)}%
                  </span>
                  <span className="interpretation">— {comparison.interpretation}</span>
                </div>

                <div className="compare-grid">
                  <div className="compare-col">
                    <div className="compare-label">Gemini</div>
                    <div className="compare-passage">{comparison.gemini.passage}</div>
                    <div className="compare-words">
                      <div className="compare-words-label">Distinctive vocabulary</div>
                      <div className="word-chips">
                        {comparison.gemini.distinctive_words.map((w) => (
                          <span key={w} className="word-chip word-chip-gemini">{w}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="compare-col">
                    <div className="compare-label">Perplexity</div>
                    <div className="compare-passage">{comparison.perplexity.passage}</div>
                    <div className="compare-words">
                      <div className="compare-words-label">Distinctive vocabulary</div>
                      <div className="word-chips">
                        {comparison.perplexity.distinctive_words.map((w) => (
                          <span key={w} className="word-chip word-chip-perplexity">{w}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button className="compare-btn" onClick={() => setShowCompare(false)}>
                  ← Back to single passage
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}