"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { User, Globe } from "lucide-react";

export type TabType = "my-dashboard" | "community-feed";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs = [
  {
    id: "my-dashboard" as TabType,
    label: "My Dashboard",
    icon: User,
    description: "Your personal complaints",
  },
  {
    id: "community-feed" as TabType,
    label: "Community Feed",
    icon: Globe,
    description: "All public complaints",
  },
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="w-full">
      <div className="relative flex bg-white rounded-2xl p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-2 py-3 px-6 text-sm font-medium transition-colors duration-200",
                isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              
              {/* Active indicator - Blue underline */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-16 bg-blue-600 rounded-full"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 35,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
