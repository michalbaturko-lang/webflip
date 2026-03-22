export default function PreviewFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company info */}
          <div>
            <h3 className="font-bold text-white text-lg mb-3">
              Webflipper.com
            </h3>
            <p className="text-gray-400 text-sm">
              Moderní web design a AI-powered optimalizace. Vytváříme webové stránky, které prodávají.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-semibold text-white mb-3">Odkazy</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://webflipper.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Domovská stránka
                </a>
              </li>
              <li>
                <a
                  href="https://webflipper.app/about"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  O nás
                </a>
              </li>
              <li>
                <a
                  href="https://webflipper.app/blog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-3">Kontakt</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:info@webflipper.app"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  info@webflipper.app
                </a>
              </li>
              <li>
                <a
                  href="tel:+420123456789"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  +420 123 456 789
                </a>
              </li>
              <li className="text-gray-400 text-sm">
                Česká Republika
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8">
          {/* Bottom section */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {currentYear} Webflipper.com. Všechna práva vyhrazena.
            </p>

            {/* Legal links */}
            <div className="flex gap-4">
              <a
                href="/privacy"
                className="text-gray-500 hover:text-gray-400 transition-colors text-sm"
              >
                Ochrana soukromí
              </a>
              <a
                href="/terms"
                className="text-gray-500 hover:text-gray-400 transition-colors text-sm"
              >
                Podmínky použití
              </a>
            </div>
          </div>
        </div>

        {/* Branding note */}
        <div className="mt-8 pt-8 border-t border-white/10 text-center">
          <p className="text-gray-500 text-xs">
            Vytvořeno s <span className="text-purple-400">❤️</span> a{" "}
            <span className="text-blue-400">AI</span> technologií
          </p>
        </div>
      </div>
    </footer>
  );
}
