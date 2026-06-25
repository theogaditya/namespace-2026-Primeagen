"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Demo from "./home/demo";
import TrustedBy from "@/components/landing/TrustedBy";
import HeroCTA from "@/components/landing/HeroCTA";
import FlowSection from "@/components/landing/FlowSection";
import FeatureVault from "@/components/landing/FeatureVault";
import ComparisonSection from "@/components/landing/ComparisonSection";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("authToken");
    if (token) {
      router.replace("/dashboard");
    } else {
      setIsChecking(false);
    }
  }, [router]);

  // Show nothing while checking auth to prevent flash
  if (isChecking) {
    return null;
  }

  return (
    <div className="overflow-x-hidden scroll-smooth">
      <Demo />
      <HeroCTA />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <TrustedBy />
      </motion.div>
      <FlowSection />
      <ComparisonSection />
      <FeatureVault />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
