import React from "react";
import { FaFacebook, FaGithub, FaInstagram, FaLinkedin, FaTwitter } from "react-icons/fa";
import LanguageSelector from "./lang";

interface Footer7Props {
  logo?: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  sections?: Array<{
    title: string;
    links: Array<{ name: string; href: string }>;
  }>;
  description?: string;
  socialLinks?: Array<{
    icon: React.ReactElement;
    href: string;
    label: string;
  }>;
  copyright?: string;
  legalLinks?: Array<{
    name: string;
    href: string;
  }>;
}

const defaultSections = [
  {
    title: "Company",
    links: [
      { name: "About", href: "/about" },
      { name: "Team", href: "/team" },
      { name: "Careers", href: "/Careers" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Help Center", href: "/Help" },
      { name: "Privacy Policy", href: "/Privacy" },
    ],
  },
];

const defaultSocialLinks = [
  { icon: <FaTwitter className="w-6 h-6" />, href: "#", label: "Twitter" },
  { icon: <FaGithub className="w-6 h-6" />, href: "#", label: "GitHub" },
];

const defaultLegalLinks = [{ name: "Terms and Conditions", href: "/tc" }];

export const Footer7 = ({
  logo = {
    url: "#",
    src: "https://swarajdesk.adityahota.online/logo.png",
    alt: "SwarajDesk Logo",
    title: "SwarajDesk.co.in",
  },
  sections = defaultSections,
  description = `Voice your issue`,
  socialLinks = defaultSocialLinks,
  copyright = "© 2025 SwarajDesk.co.in. All rights reserved.",
  legalLinks = defaultLegalLinks,
}: Footer7Props) => {
  return (
    <div>
             <div>
          <LanguageSelector />
        </div>
    </div>
  );
};