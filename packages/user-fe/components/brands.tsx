import { cn } from "@/lib/utils";
import { LogoCloud } from "@/components/ui/logo-cloud-3";

export default function Brands() {
  return (
    <div className="py-2 w-full place-content-center px-3 sm:px-4">
    <div
        aria-hidden="true"
        className={cn(
          "-z-10 -top-1/2 -translate-x-1/2 pointer-events-none absolute left-1/2 h-[120vmin] w-[120vmin] rounded-b-full",
          "bg-[radial-gradient(ellipse_at_center,--theme(--color-foreground/.1),transparent_50%)]",
          "blur-[30px]"
        )}
      />

      <section className="relative mx-auto max-w-3xl">
        <h2 className="mb-3 sm:mb-5 text-center font-medium text-foreground text-base sm:text-lg md:text-xl lg:text-3xl tracking-tight px-2">
          <span className="text-muted-foreground">Chosen by those</span>
          <br />
          <span className="font-semibold">who serve the nation</span>
        </h2>
        <div className="mx-auto my-3 sm:my-5 h-px max-w-sm bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />

        <LogoCloud logos={logos} />

        <div className="mt-3 sm:mt-5 h-px bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
      </section>
    </div>
  );
}


const logos = [
  {
    src: "https://sih-swaraj.s3.ap-south-2.amazonaws.com/public-media/govlogo/Flag_of_Jharkhand.svg",
    alt: "Nvidia Logo",
  },
  {
    src: "https://sih-swaraj.s3.ap-south-2.amazonaws.com/public-media/govlogo/Government_of_India_logo.svg",
    alt: "Supabase Logo",
  },
  {
    src: "https://sih-swaraj.s3.ap-south-2.amazonaws.com/public-media/govlogo/Ranchi_Municipal_Corporation_logo.png",
    alt: "OpenAI Logo",
  },
  {
    src: "https://sih-swaraj.s3.ap-south-2.amazonaws.com/public-media/govlogo/Seal_of_Odisha.svg",
    alt: "Turso Logo",
  },
  {
    src: "https://sih-swaraj.s3.ap-south-2.amazonaws.com/public-media/govlogo/Logo_of_Asansol_Municipal_Corporation.jpg",
    alt: "Vercel Logo",
  },
];
