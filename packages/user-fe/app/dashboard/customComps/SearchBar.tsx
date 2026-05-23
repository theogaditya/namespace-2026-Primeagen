"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_CONFIG, ComplaintStatus } from "./types";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onStatusFilter: (status: string) => void;
  isSearching?: boolean;
  placeholder?: string;
}

export function SearchBar({
  onSearch,
  onStatusFilter,
  isSearching = false,
  placeholder = "Search your complaints...",
}: SearchBarProps) {
  const [searchValue, setSearchValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onSearch(value);
      }, 300);
    },
    [onSearch]
  );

  // Clear search
  const handleClear = () => {
    setSearchValue("");
    onSearch("");
    inputRef.current?.focus();
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div
          className={cn(
            "relative flex-1 transition-all duration-200",
            isFocused && "ring-2 ring-blue-500/20 rounded-xl"
          )}
        >
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>
          <Input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={cn(
              "pl-12 pr-10 h-12 text-base rounded-xl border-2",
              "placeholder:text-gray-400",
              "transition-all duration-200",
              isFocused ? "border-blue-500" : "border-gray-200 hover:border-gray-300"
            )}
          />
          <AnimatePresence>
            {searchValue && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <div className="p-3 bg-gray-100 rounded-xl">
            <Filter className="w-5 h-5 text-gray-500" />
          </div>
          <Select onValueChange={onStatusFilter} value="all">
            <SelectTrigger className="w-40 h-12 rounded-xl border-2 border-gray-200">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.keys(STATUS_CONFIG) as ComplaintStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  <span className={cn("font-medium", STATUS_CONFIG[status].color)}>
                    {STATUS_CONFIG[status].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search tip */}
      <p className="mt-2 text-xs text-gray-400">
        Search by complaint ID, description, category, or location
      </p>
    </motion.div>
  );
}
