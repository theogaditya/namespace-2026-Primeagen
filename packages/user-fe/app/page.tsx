"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Brands from "@/components/brands";
import Demo from "./home/demo";
import Features from '@/components/Features';
import { CTASection } from "@/components/cta";
import { AIInputWithSuggestionsDemo } from "@/components/chat";
import { Footer7 } from "@/components/footer";

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
    <div>
      <Demo />
      <Brands />
      <br></br><br></br>
      <Features />
      <AIInputWithSuggestionsDemo />
      <CTASection />
      {/* <Footer7/> */}
    </div>
  );
}
