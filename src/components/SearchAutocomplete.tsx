"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { getSearchSuggestions, type SearchSuggestion } from "@/data/search-keywords";

const MAX_RECENT_SEARCHES = 5;

interface Props {
  minimal?: boolean;
}

export default function SearchAutocomplete({ minimal = false }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sewakhoj_recent_searches");
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, MAX_RECENT_SEARCHES));
      }
    } catch (e) {
      console.error("Failed to load recent searches:", e);
    }
  }, []);

  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) return;
    const trimmed = searchQuery.trim();
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem("sewakhoj_recent_searches", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save recent search:", e);
      }
      return updated;
    });
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (value.trim().length >= 2) {
      const results = getSearchSuggestions(value);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setActiveIndex(-1);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, []);

  const navigateToService = useCallback(
    (serviceId: string) => {
      if (!serviceId) return;
      setShowDropdown(false);
      setQuery("");
      const cleanId = serviceId.trim().toLowerCase();
      router.push(`/services/${cleanId}`);
    },
    [router]
  );

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        navigateToService(suggestions[activeIndex].serviceId);
      } else if (query.trim()) {
        saveRecentSearch(query);
        router.push(`/browse?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [activeIndex, suggestions, navigateToService, query, router, saveRecentSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            navigateToService(suggestions[activeIndex].serviceId);
          }
          break;
        case "Escape":
          setShowDropdown(false);
          setActiveIndex(-1);
          break;
      }
    },
    [showDropdown, suggestions, activeIndex, navigateToService]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className={`relative w-full ${minimal ? "" : "max-w-3xl mx-auto"}`}>
      <form 
        onSubmit={handleSearch} 
        className={`search-bar flex flex-col md:flex-row gap-3 ${
          minimal 
            ? "bg-transparent p-0 shadow-none" 
            : "bg-white p-4 rounded-xl shadow-lg"
        }`} 
        role="search"
        aria-label="Search for services"
      >
        <div className="flex-1">
          <label htmlFor="search-input" className="block text-sm font-medium text-gray-600 mb-1">{minimal ? "" : "खोज्नुहोस्"}</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
            <input
              id="search-input"
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if ((suggestions.length > 0 && query.trim().length >= 2) || recentSearches.length > 0) {
                  setShowDropdown(true);
                }
              }}
              placeholder="Try pipe leak, math tutor..."
              className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-sewakhoj-red text-gray-700 font-medium ${
                minimal 
                  ? "bg-gray-50 border-transparent focus:bg-white" 
                  : "bg-white border-gray-300"
              }`}
              aria-label="Search for services"
              aria-autocomplete="list"
              aria-controls="search-suggestions"
              aria-expanded={showDropdown}
              aria-describedby="search-help"
              autoComplete="off"
            />
          </div>
        </div>
        <span id="search-help" className="sr-only">
          Type at least 2 characters to see suggestions. Use arrow keys to navigate.
        </span>
        <button 
          type="submit" 
          className={`bg-sewakhoj-red text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-700 active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5 ${
            minimal ? "md:min-w-[100px]" : "min-w-[120px]"
          }`}
          aria-label="Search"
        >
          {minimal ? (
            <span className="text-sm">Go</span>
          ) : (
            <>
              <span>Search</span>
              <span className="text-[10px] opacity-70">खोज्नुहोस्</span>
            </>
          )}
        </button>
      </form>

      {showDropdown && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden max-h-80 overflow-y-auto"
          aria-label="Search suggestions"
        >
          {query.trim().length < 2 && recentSearches.length > 0 && (
            <>
              <div className="px-3 py-2 border-b border-gray-50">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Searches</span>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={`recent-${index}`}
                  onClick={() => {
                    setQuery(search);
                    router.push(`/browse?q=${encodeURIComponent(search)}`);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 text-gray-700"
                  role="option"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3" />
                  </svg>
                  <span className="font-medium">{search}</span>
                </button>
              ))}
            </>
          )}
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.serviceId}
              role="option"
              aria-selected={index === activeIndex}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                index === activeIndex
                  ? "bg-sewakhoj-red/10 text-sewakhoj-red"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
              onClick={() => navigateToService(suggestion.serviceId)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="text-2xl" aria-hidden="true">{suggestion.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-sm">{suggestion.category}</span>
                <span className="text-xs text-gray-400 ml-2">
                  via {"'"} {suggestion.matchedKeyword} {"'"}
                </span>
              </div>
              <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
