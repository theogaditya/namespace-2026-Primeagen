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
    <footer className="bg-gray-50 dark:bg-gray-900 py-16">

      <div className="container mx-auto px-4 max-w-7xl">
        <div>
          <LanguageSelector />
        </div>
        <div className="flex flex-col lg:flex-row justify-between gap-12 lg:items-start">
          {/* Logo + Description + Social */}
          <div className="flex flex-col items-center lg:items-start max-w-sm text-center lg:text-left">
            <a href={logo.url} aria-label="Homepage" className="inline-flex items-center gap-3 mb-4 scale-110">
              <img src={logo.src} alt={logo.alt} title={logo.title} className="h-20 w-auto" />
              <span className="text-2xl font-semibold text-gray-900 dark:text-white">{logo.title}</span>
            </a>
            <p className="mb-6 text-gray-600 dark:text-gray-400">{description}</p>
            <ul className="flex space-x-6">
              {socialLinks.map(({ icon, href, label }, idx) => (
                <li key={idx}>
                  <a
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  >
                    {icon}
                  </a>
                </li>
              ))}
            </ul>
          </div>


          {/* Links Sections */}
          <div className="grid grid-cols-2 gap-30">
            {sections.map(({ title, links }, idx) => (
              <nav key={idx} aria-label={title}>
                <h3 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                <ul className="space-y-3">
                  {links.map(({ name, href }, linkIdx) => (
                    <li key={linkIdx}>
                      <a
                        href={href}
                        className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 font-medium transition-colors"
                      >
                        {name}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* Bottom legal & copyright */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse md:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400 gap-4">
          <p>{copyright}</p>
          <ul className="flex space-x-6">
            {legalLinks.map(({ name, href }, idx) => (
              <li key={idx}>
                <a
                  href={href}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
};