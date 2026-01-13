'use client';

import { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';

export default function Home() {
  const [text, setText] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [qrColor, setQrColor] = useState('#DC2626');
  const [logo, setLogo] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const getQRValue = () => {
    if (phoneNumber) {
      return `tel:${phoneNumber}`;
    }
    return text || 'https://exemple.com';
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogo(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const exportToPNG = async () => {
    if (qrRef.current) {
      const canvas = await html2canvas(qrRef.current, {
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = 'qrcode.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const exportToSVG = () => {
    if (qrRef.current) {
      const svg = qrRef.current.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'qrcode.svg';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-red-100 py-12 px-4 flex flex-col">
      <div className="max-w-4xl mx-auto flex-1">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-2">
          Générateur de QR Code
        </h1>
        <p className="text-center text-gray-700 mb-8">
          Créez des QR codes personnalisés avec logo et exportez-les en PNG ou SVG
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Texte personnalisé
                </label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Entrez votre texte"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                  disabled={!!phoneNumber}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+33612345678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: +33612345678 (prioritaire sur le texte)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Couleur du QR Code
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={qrColor}
                    onChange={(e) => setQrColor(e.target.value)}
                    className="h-10 w-20 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">{qrColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo central (optionnel)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={exportToPNG}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md hover:shadow-lg"
              >
                Exporter PNG
              </button>
              <button
                onClick={exportToSVG}
                className="flex-1 bg-red-700 text-white py-2 px-4 rounded-lg hover:bg-red-800 transition-colors font-medium shadow-md hover:shadow-lg"
              >
                Exporter SVG
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Aperçu</h2>

            <div className="flex items-center justify-center">
              <div ref={qrRef} className="relative inline-block p-8 bg-white">
                <QRCode
                  value={getQRValue()}
                  size={256}
                  fgColor={qrColor}
                  level="H"
                />
                {logo && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <img
                      src={logo}
                      alt="Logo"
                      className="w-16 h-16 object-contain bg-white rounded-lg p-1"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs text-red-900 font-semibold">
                <strong>Contenu du QR Code:</strong>
              </p>
              <p className="text-sm text-gray-900 font-mono break-all mt-1">
                {getQRValue()}
              </p>
            </div>
          </div>
        </div>
      </div>
      <footer className="mt-12 text-center text-gray-600 text-sm">
        Powered by <span className="font-semibold text-red-600">Annexx</span> - <span className="font-semibold text-red-600">MIB</span>
      </footer>
    </div>
  );
}
