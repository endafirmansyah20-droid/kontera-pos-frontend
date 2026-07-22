import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const PwaInstallContext = createContext({ canInstall: false, promptInstall: async () => false });

export function PwaInstallProvider({ children }) {
  const [installEvent, setInstallEvent] = useState(null);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      // Cegah browser menampilkan mini-infobar otomatis di halaman manapun (mis. LandingPage).
      // Event disimpan agar bisa dipicu manual dari tombol Install di LoginPage.
      e.preventDefault();
      setInstallEvent(e);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installEvent) return false;
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    // Event bersifat sekali pakai — clear apapun outcome-nya
    setInstallEvent(null);
    return outcome === 'accepted';
  }, [installEvent]);

  return (
    <PwaInstallContext.Provider value={{ canInstall: !!installEvent, promptInstall }}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function useInstallPrompt() {
  return useContext(PwaInstallContext);
}
