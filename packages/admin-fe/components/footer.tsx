import React from "react";
import { FaFacebook, FaGithub, FaInstagram, FaLinkedin, FaTwitter } from "react-icons/fa";

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
  { icon: <FaFacebook className="w-5 h-5" />, href: "#", label: "Facebook" },
  { icon: <FaTwitter className="w-5 h-5" />, href: "#", label: "Twitter" },
  { icon: <FaInstagram className="w-5 h-5" />, href: "#", label: "Instagram" },
  { icon: <FaLinkedin className="w-5 h-5" />, href: "#", label: "LinkedIn" },
  { icon: <FaGithub className="w-5 h-5" />, href: "#", label: "GitHub" },
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
    <footer className="bg-white/60 backdrop-blur-sm border-t border-gray-200 py-12">

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col lg:flex-row justify-between gap-8 lg:items-start">
          {/* Logo + Description + Social */}
          <div className="flex flex-col items-center lg:items-start max-w-sm text-center lg:text-left">
            <a href={logo.url} aria-label="Homepage" className="inline-flex items-center gap-3 mb-3">
              <img src={logo.src} alt={logo.alt} title={logo.title} className="h-20 w-auto" />
              <span className="text-2xl font-semibold text-gray-900">{logo.title}</span>
            </a>
            <p className="mb-4 text-gray-600">{description}</p>
            <ul className="flex space-x-3">
              {socialLinks.map(({ icon, href, label }, idx) => (
                <li key={idx}>
                  <a
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/70 text-gray-600 hover:bg-white hover:text-blue-600 transition-colors shadow-sm"
                  >
                    {icon}
                  </a>
                </li>
              ))}
            </ul>
          </div>


          {/* Links Sections */}
          <div className="grid grid-cols-2 gap-8">
            {sections.map(({ title, links }, idx) => (
              <nav key={idx} aria-label={title}>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">{title}</h3>
                <ul className="space-y-2">
                  {links.map(({ name, href }, linkIdx) => (
                    <li key={linkIdx}>
                      <a
                        href={href}
                        className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
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
        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col-reverse md:flex-row justify-between items-center text-sm text-gray-500 gap-4">
          <p>{copyright}</p>
          <ul className="flex space-x-4">
            {legalLinks.map(({ name, href }, idx) => (
              <li key={idx}>
                <a
                  href={href}
                  className="text-gray-600 hover:text-blue-600 transition-colors"
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