import Brands from "@/components/brands";
import Demo from "./home/demo";
import Features from '@/components/Features';
import { CTASection } from "@/components/cta";
import { AIInputWithSuggestionsDemo } from "@/components/chat";
import { Footer7 } from "@/components/footer";

export default function Home() {
  return (
    <div>
      <Demo />
      <Brands />
      <br></br><br></br>
      <Features />
      <AIInputWithSuggestionsDemo />
      <CTASection />
      <Footer7/>
    </div>
  );
}
