"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { getSearchSuggestions, type SearchSuggestion } from "@/data/search-keywords";

interface Props {
  minimal?: boolean;
}

export default function SearchAutocomplete({ minimal = false }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
      // Robust redirect: ensure the service ID is cleaned
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
        router.push(`/browse?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, activeIndex, suggestions, navigateToService, router]
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
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0 && query.trim().length >= 2) {
                setShowDropdown(true);
              }
            }}
            placeholder="खोज्नुहोस्... Try pipe leak, math tutor..."
            className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-sewakhoj-red text-gray-700 font-medium ${
              minimal 
                ? "bg-gray-50 border-transparent focus:bg-white" 
                : "bg-white border-gray-300"
            }`}
            aria-label="Search for services"
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={showDropdown}
            autoComplete="off"
          />
        </div>
        <button 
          type="submit" 
          className={`bg-sewakhoj-red text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-700 active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5 ${
            minimal ? "md:min-w-[100px]" : "min-w-[120px]"
          }`}
        >
          {minimal ? (
            <span className="text-sm">Go</span>
          ) : (
            <>
              <span>Search</span>
              <span className="text-[9px] opacity-70">खोज्नुहोस्</span>
            </>
          )}
        </button>
      </form>

      {showDropdown && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
        >
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
              <span className="text-2xl">{suggestion.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-sm">{suggestion.category}</span>
                <span className="text-xs text-gray-400 ml-2">
                  via {"'"} {suggestion.matchedKeyword} {"'"}
                </span>
              </div>
              <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
