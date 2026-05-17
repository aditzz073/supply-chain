import { useState, useRef, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (medicine: string) => void;
  loading: boolean;
  history: string[];
}

export default function SearchBar({ onSearch, loading, history }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as HTMLElement)) {
        setShowHistory(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowHistory(false);
    }
  };

  const handleHistoryClick = (item: string) => {
    setQuery(item);
    onSearch(item);
    setShowHistory(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => history.length > 0 && setShowHistory(true)}
            placeholder="Enter medicine name (e.g., Metformin)"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-gray-800 bg-white shadow-sm"
            disabled={loading}
          />
          {showHistory && history.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              <div className="px-3 py-2 text-xs text-gray-400 font-medium">
                Recent searches
              </div>
              {history.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleHistoryClick(item)}
                  className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-gray-700 text-sm transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            'Search'
          )}
        </button>
      </form>
    </div>
  );
}
