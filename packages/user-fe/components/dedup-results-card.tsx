"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, AlertTriangle, ThumbsUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DedupMatch {
  id: string;
  seq: number;
  description: string;
  similarity: number;
  status: string;
  upvoteCount: number;
}

interface DedupResultsCardProps {
  description: string;
  categoryName: string;
  district: string;
  onUpvoteInstead?: (complaintId: string) => void;
  onProceed?: () => void;
}

type DedupState = "idle" | "checking" | "found" | "none" | "error";

export function DedupResultsCard({
  description,
  categoryName,
  district,
  onUpvoteInstead,
  onProceed,
}: DedupResultsCardProps) {
  const [state, setState] = useState<DedupState>("idle");
  const [matches, setMatches] = useState<DedupMatch[]>([]);

  useEffect(() => {
    if (!description || description.length < 20) return;

    const checkDuplicates = async () => {
      setState("checking");
      try {
        const res = await fetch("/api/agents/dedup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, categoryName, district }),
        });

        if (!res.ok) {
          setState("none");
          return;
        }

        const data = await res.json();
        if (data.hasSimilar && data.matches?.length > 0) {
          setMatches(data.matches);
          setState("found");
        } else {
          setState("none");
        }
      } catch {
        setState("error");
      }
    };

    const timer = setTimeout(checkDuplicates, 500);
    return () => clearTimeout(timer);
  }, [description, categoryName, district]);

  if (state === "idle") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 overflow-hidden"
    >
      {/* Checking state */}
      {state === "checking" && (
        <div className="flex items-center gap-3 px-5 py-4 bg-blue-50 border-blue-200">
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          <div>
            <p className="font-medium text-blue-800">Checking for similar complaints...</p>
            <p className="text-xs text-blue-600">Our AI is looking for existing reports like yours</p>
          </div>
        </div>
      )}

      {/* No duplicates */}
      {state === "none" && (
        <div className="flex items-center gap-3 px-5 py-4 bg-green-50 border-green-200">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">No similar complaints found</p>
            <p className="text-xs text-green-600">Your complaint appears to be unique — go ahead and submit!</p>
          </div>
        </div>
      )}

      {/* Error - non-blocking */}
      {state === "error" && (
        <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-gray-200">
          <CheckCircle2 className="h-5 w-5 text-gray-400" />
          <p className="text-sm text-gray-500">Duplicate check unavailable — you can still submit</p>
        </div>
      )}

      {/* Matches found */}
      {state === "found" && (
        <div className="border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">
                {matches.length} similar complaint{matches.length > 1 ? "s" : ""} found
              </p>
              <p className="text-xs text-amber-600">
                Consider upvoting an existing one instead of creating a duplicate
              </p>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <AnimatePresence>
              {matches.slice(0, 3).map((match, i) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">#{match.seq}</span>
                        <span
                          className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded-full",
                            match.similarity >= 0.8
                              ? "bg-red-100 text-red-700"
                              : match.similarity >= 0.6
                                ? "bg-amber-100 text-amber-700"
                                : "bg-yellow-100 text-yellow-700"
                          )}
                        >
                          {Math.round(match.similarity * 100)}% match
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                          {match.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{match.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        👍 {match.upvoteCount} upvote{match.upvoteCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-100"
                      onClick={() => onUpvoteInstead?.(match.id)}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      Upvote
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {matches.length > 3 && (
              <p className="text-xs text-center text-amber-600">
                +{matches.length - 3} more similar complaint{matches.length - 3 > 1 ? "s" : ""}
              </p>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-gray-500 hover:text-gray-700"
                onClick={onProceed}
              >
                Submit anyway →
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
