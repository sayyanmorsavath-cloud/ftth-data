import { useState, useEffect } from "react";
import { Download, X, Share, Plus, Smartphone } from "lucide-react";

const STORAGE_KEY = "ftth_install_dismissed";

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(STORAGE_KEY) === "1") return;

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);

    if (isIOS()) {
      setIos(true);
      setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setInstalling(false);
    if (outcome === "accepted") {
      dismiss();
    } else {
      setDeferredPrompt(null);
      setShow(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={dismiss}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md"
        style={{ padding: "0 12px 20px" }}
      >
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(160deg,#1a0505 0%,#6b1414 55%,#c0392b 100%)",
            boxShadow: "0 -4px 40px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-white/50 hover:text-white/90 transition-colors"
            style={{ position: "absolute", top: 16, right: 16 }}
          >
            <X size={18} />
          </button>

          <div className="px-6 pt-6 pb-5">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0"
                style={{ border: "1px solid rgba(255,255,255,0.2)", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}
              >
                <img src="/logo.jpg" alt="LTC FTTH" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-white font-black text-lg leading-tight">LTC FTTH Tracker</h2>
                <p className="text-white/60 text-xs mt-0.5">ຕິດຕັ້ງ App ໃສ່ໜ້າຈໍ</p>
              </div>
            </div>

            <p className="text-white/75 text-sm leading-relaxed mb-5">
              ຕິດຕັ້ງ App ໃສ່ໜ້າຈໍຫລັກ ເພື່ອເຂົ້າໃຊ້ງານໄດ້ງ່າຍ ໄວ ແລະ ໃຊ້ງານຄືກັບ App ຈິງ
            </p>

            {ios ? (
              <div
                className="rounded-2xl p-4 mb-5 space-y-3"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <p className="text-white/90 text-xs font-bold uppercase tracking-widest mb-3">ວິທີຕິດຕັ້ງ iPhone / iPad</p>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-black">1</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Share size={15} className="text-blue-300 flex-shrink-0" />
                    <p className="text-white/80 text-sm">ກົດໄອຄອນ <span className="text-blue-300 font-bold">Share</span> ໃນ Safari</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-black">2</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Plus size={15} className="text-green-300 flex-shrink-0" />
                    <p className="text-white/80 text-sm">ເລືອກ <span className="text-green-300 font-bold">"Add to Home Screen"</span></p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-black">3</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone size={15} className="text-yellow-300 flex-shrink-0" />
                    <p className="text-white/80 text-sm">ກົດ <span className="text-yellow-300 font-bold">"Add"</span> ເພື່ອຕິດຕັ້ງ</p>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleInstall}
                disabled={installing || !deferredPrompt}
                className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 mb-4 transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,hsl(0,66%,42%) 0%,hsl(0,66%,30%) 100%)",
                  boxShadow: "0 6px 24px rgba(180,30,30,0.5)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {installing
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> ກຳລັງຕິດຕັ້ງ...</>
                  : <><Download size={16} /> ຕິດຕັ້ງ App ໃສ່ໜ້າຈໍ</>}
              </button>
            )}

            <button
              onClick={dismiss}
              className="w-full py-2.5 text-white/40 text-xs font-medium hover:text-white/70 transition-colors"
            >
              ບໍ່ຕ້ອງການ ຂ້າມໄປກ່ອນ
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
