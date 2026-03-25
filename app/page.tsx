'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import Image from 'next/image';
import xkeyLinks from '@/data/xkey-links.json';

const STORAGE_KEY = 'xkey-qr-manager-state';
const ANDROID_DOWNLOAD_URL = xkeyLinks.android;

type Platform = 'ios' | 'android';

type LinkEntry = {
  url: string;
  code: string;
  consumedAt: string | null;
  importedAt: string;
};

type PersistedState = {
  iosLinks: LinkEntry[];
  selectedPlatform: Platform;
  selectedIosUrl: string | null;
  fileName: string;
  qrColor: string;
  logo: string | null;
};

const defaultState: PersistedState = {
  iosLinks: [],
  selectedPlatform: 'ios',
  selectedIosUrl: null,
  fileName: 'xkey-qrcode',
  qrColor: '#DC2626',
  logo: null,
};

const getCodeFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('code') ?? '';
  } catch {
    return '';
  }
};

const buildEntriesFromUrls = (
  urls: string[],
  previousEntries: LinkEntry[],
  importedAtOverride?: string,
) => {
  const previousMap = new Map(previousEntries.map((entry) => [entry.url, entry]));
  const importedAt = importedAtOverride ?? new Date().toISOString();

  return urls.map((url) => {
    const existing = previousMap.get(url);
    return {
      url,
      code: getCodeFromUrl(url),
      consumedAt: existing?.consumedAt ?? null,
      importedAt: existing?.importedAt ?? importedAt,
    };
  });
};

const downloadBlob = (content: BlobPart, fileName: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

const BUNDLED_IOS_LINKS = buildEntriesFromUrls(xkeyLinks.ios, [], 'bundled-demo');

export default function Home() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('ios');
  const [iosLinks, setIosLinks] = useState<LinkEntry[]>(BUNDLED_IOS_LINKS);
  const [selectedIosUrl, setSelectedIosUrl] = useState<string | null>(BUNDLED_IOS_LINKS[0]?.url ?? null);
  const [fileName, setFileName] = useState(defaultState.fileName);
  const [qrColor, setQrColor] = useState(defaultState.qrColor);
  const [logo, setLogo] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Les liens iOS sont embarqués dans le projet pour cette démonstration.',
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PersistedState>;
        setSelectedPlatform(parsed.selectedPlatform === 'android' ? 'android' : 'ios');
        const storedLinks = Array.isArray(parsed.iosLinks) && parsed.iosLinks.length > 0 ? parsed.iosLinks : BUNDLED_IOS_LINKS;
        setIosLinks(storedLinks);
        setSelectedIosUrl(parsed.selectedIosUrl ?? storedLinks[0]?.url ?? null);
        setFileName(parsed.fileName?.trim() || defaultState.fileName);
        setQrColor(parsed.qrColor || defaultState.qrColor);
        setLogo(parsed.logo ?? null);
      } else {
        setIosLinks(BUNDLED_IOS_LINKS);
        setSelectedIosUrl(BUNDLED_IOS_LINKS[0]?.url ?? null);
      }
    } catch {
      // Ignore invalid local storage data.
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const state: PersistedState = {
      iosLinks,
      selectedPlatform,
      selectedIosUrl,
      fileName,
      qrColor,
      logo,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [fileName, iosLinks, isHydrated, logo, qrColor, selectedIosUrl, selectedPlatform]);

  const availableIosLinks = useMemo(
    () => iosLinks.filter((entry) => !entry.consumedAt),
    [iosLinks],
  );
  const consumedIosLinks = useMemo(
    () => iosLinks.filter((entry) => Boolean(entry.consumedAt)),
    [iosLinks],
  );

  useEffect(() => {
    if (selectedPlatform !== 'ios') {
      return;
    }

    const currentEntry = iosLinks.find((entry) => entry.url === selectedIosUrl);
    if (currentEntry) {
      return;
    }

    setSelectedIosUrl(availableIosLinks[0]?.url ?? iosLinks[0]?.url ?? null);
  }, [availableIosLinks, iosLinks, selectedIosUrl, selectedPlatform]);

  const currentIosEntry = useMemo(
    () => iosLinks.find((entry) => entry.url === selectedIosUrl) ?? null,
    [iosLinks, selectedIosUrl],
  );

  const currentQrValue =
    selectedPlatform === 'android' ? ANDROID_DOWNLOAD_URL : currentIosEntry?.url ?? '';

  const exportBaseName = (fileName || '').trim() || 'xkey-qrcode';

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setLogo(loadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const markCurrentLinkAsConsumed = () => {
    if (!currentIosEntry) {
      return;
    }

    const consumedAt = new Date().toISOString();
    const nextEntries = iosLinks.map((entry) =>
      entry.url === currentIosEntry.url ? { ...entry, consumedAt } : entry,
    );
    const nextAvailable = nextEntries.find((entry) => !entry.consumedAt);

    setIosLinks(nextEntries);
    setSelectedIosUrl(nextAvailable?.url ?? currentIosEntry.url);
    setStatusMessage(`Lien ${currentIosEntry.code || currentIosEntry.url} marqué comme consommé.`);
  };

  const restoreLink = (url: string) => {
    const nextEntries = iosLinks.map((entry) =>
      entry.url === url ? { ...entry, consumedAt: null } : entry,
    );
    setIosLinks(nextEntries);
    setSelectedIosUrl(url);
    setStatusMessage('Le lien a été remis dans la liste des disponibles.');
  };

  const goToNextAvailableLink = () => {
    if (availableIosLinks.length === 0) {
      setStatusMessage('Aucun lien disponible restant.');
      return;
    }

    const currentAvailableIndex = availableIosLinks.findIndex((entry) => entry.url === selectedIosUrl);
    const nextEntry =
      currentAvailableIndex >= 0
        ? availableIosLinks[currentAvailableIndex + 1] ?? availableIosLinks[0]
        : availableIosLinks[0];

    setSelectedIosUrl(nextEntry.url);
    setStatusMessage(`Lien suivant sélectionné: ${nextEntry.code || nextEntry.url}`);
  };

  const exportConsumedLinks = () => {
    if (consumedIosLinks.length === 0) {
      setStatusMessage('Aucun lien consommé à exporter pour le moment.');
      return;
    }

    const header = ['platform', 'code', 'url', 'consumedAt', 'importedAt'];
    const rows = consumedIosLinks.map((entry) => [
      'ios',
      entry.code,
      entry.url,
      entry.consumedAt ?? '',
      entry.importedAt,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(','),
      )
      .join('\n');

    downloadBlob(csv, `${exportBaseName}-consommes.csv`, 'text/csv;charset=utf-8');
    setStatusMessage(`${consumedIosLinks.length} lien(s) consommé(s) exporté(s) en CSV.`);
  };

  const exportToPNG = async () => {
    if (!qrRef.current || !currentQrValue) {
      return;
    }

    const canvas = await html2canvas(qrRef.current, {
      backgroundColor: '#ffffff',
    });
    const link = document.createElement('a');
    link.download = `${exportBaseName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const exportToSVG = () => {
    if (!qrRef.current || !currentQrValue) {
      return;
    }

    const svg = qrRef.current.querySelector('svg');
    if (!svg) {
      return;
    }

    const svgClone = svg.cloneNode(true) as SVGElement;
    const width = svg.getAttribute('width') || '256';
    const height = svg.getAttribute('height') || '256';
    const viewBox = svg.getAttribute('viewBox') || `0 0 ${width} ${height}`;
    const size = Number(width);

    const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    newSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    newSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    newSvg.setAttribute('width', width);
    newSvg.setAttribute('height', height);
    newSvg.setAttribute('viewBox', viewBox);

    while (svgClone.firstChild) {
      newSvg.appendChild(svgClone.firstChild);
    }

    if (logo) {
      const viewBoxValues = viewBox.split(' ').map(Number);
      const viewBoxWidth = viewBoxValues[2] || size;
      const logoSizePx = 64;
      const paddingPx = 4;
      const scaleX = viewBoxWidth / size;
      const logoSize = logoSizePx * scaleX;
      const padding = paddingPx * scaleX;
      const logoX = viewBoxWidth / 2 - logoSize / 2;
      const logoY = viewBoxWidth / 2 - logoSize / 2;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(logoX - padding));
      rect.setAttribute('y', String(logoY - padding));
      rect.setAttribute('width', String(logoSize + padding * 2));
      rect.setAttribute('height', String(logoSize + padding * 2));
      rect.setAttribute('rx', String(padding));
      rect.setAttribute('fill', '#ffffff');
      newSvg.appendChild(rect);

      const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', logo);
      image.setAttribute('x', String(logoX));
      image.setAttribute('y', String(logoY));
      image.setAttribute('width', String(logoSize));
      image.setAttribute('height', String(logoSize));
      image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      newSvg.appendChild(image);
    }

    const svgData = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(newSvg)}`;
    downloadBlob(svgData, `${exportBaseName}.svg`, 'image/svg+xml;charset=utf-8');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff1f2,_#ffe4e6_40%,_#fecdd3)] px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3">
          <span className="w-fit rounded-full border border-rose-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-rose-700">
            XKey QR Manager
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
            Génération QR par plateforme avec suivi des liens consommés
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-700">
            Importez vos liens Apple uniques depuis Excel, choisissez la plateforme avant affichage du QR code,
            marquez les liens utilisés, puis exportez la liste des consommés en CSV.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr_1fr]">
          <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Configuration</h2>
                <p className="text-sm text-slate-600">La plateforme détermine le lien encodé dans le QR.</p>
              </div>
              <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                {selectedPlatform === 'ios' ? 'Mode iOS' : 'Mode Android'}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Plateforme</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform('ios')}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      selectedPlatform === 'ios'
                        ? 'border-rose-400 bg-rose-50 text-rose-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200'
                    }`}
                  >
                    <div className="text-sm font-semibold">iPhone / iPad</div>
                    <div className="mt-1 text-xs text-slate-500">Liens uniques importés depuis le fichier Excel.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform('android')}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      selectedPlatform === 'android'
                        ? 'border-rose-400 bg-rose-50 text-rose-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200'
                    }`}
                  >
                    <div className="text-sm font-semibold">Android</div>
                    <div className="mt-1 text-xs text-slate-500">Lien fixe APK partagé pour tous les appareils Android.</div>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="mb-2 block text-sm font-medium text-slate-700">Jeu de données iOS embarqué</div>
                <p className="text-sm text-slate-700">
                  {xkeyLinks.ios.length} lien(s) Apple sont chargés depuis le fichier JSON du projet.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Fichier source: <code>data/xkey-links.json</code>
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nom du fichier exporté</label>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(event) => setFileName(event.target.value)}
                    placeholder="xkey-mars-2026"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-rose-400"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Couleur du QR</label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-3 py-2">
                    <input
                      type="color"
                      value={qrColor}
                      onChange={(event) => setQrColor(event.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-lg border-0 bg-transparent"
                    />
                    <span className="font-mono text-sm text-slate-700">{qrColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Logo central</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-slate-700"
                />
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {statusMessage}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_20px_80px_-30px_rgba(15,23,42,0.35)]">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">QR courant</h2>
              <p className="text-sm text-slate-600">
                {selectedPlatform === 'android'
                  ? 'Le QR Android pointe vers l’APK commun.'
                  : 'Le QR iOS affiche le lien Apple actuellement sélectionné.'}
              </p>
            </div>

            <div className="mb-5 flex items-center justify-center">
              <div ref={qrRef} className="relative inline-flex rounded-[2rem] bg-white p-8 shadow-inner">
                {currentQrValue ? (
                  <>
                    <QRCode value={currentQrValue} size={256} fgColor={qrColor} level="H" />
                    {logo ? (
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-1.5 shadow-sm">
                        <Image
                          src={logo}
                          alt="Logo"
                          width={64}
                          height={64}
                          unoptimized
                          className="h-16 w-16 rounded-xl object-contain"
                        />
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="flex h-64 w-64 items-center justify-center rounded-3xl border border-dashed border-slate-300 text-center text-sm text-slate-500">
                    Importez un fichier iOS ou passez sur Android pour générer un QR.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lien encodé</div>
                <div className="break-all font-mono text-sm text-slate-900">
                  {currentQrValue || 'Aucun lien sélectionné'}
                </div>
              </div>

              {selectedPlatform === 'ios' ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Lien iOS sélectionné</label>
                    <select
                      value={selectedIosUrl ?? ''}
                      onChange={(event) => setSelectedIosUrl(event.target.value || null)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-400"
                    >
                      {iosLinks.length === 0 ? <option value="">Aucun lien importé</option> : null}
                      {availableIosLinks.length > 0 ? (
                        <optgroup label="Disponibles">
                          {availableIosLinks.map((entry) => (
                            <option key={entry.url} value={entry.url}>
                              {entry.code || entry.url}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {consumedIosLinks.length > 0 ? (
                        <optgroup label="Consommés">
                          {consumedIosLinks.map((entry) => (
                            <option key={entry.url} value={entry.url}>
                              {entry.code || entry.url}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={goToNextAvailableLink}
                      disabled={availableIosLinks.length === 0}
                      className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Lien suivant disponible
                    </button>
                    <button
                      type="button"
                      onClick={markCurrentLinkAsConsumed}
                      disabled={!currentIosEntry || Boolean(currentIosEntry.consumedAt)}
                      className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Marquer comme consommé
                    </button>
                    <button
                      type="button"
                      onClick={() => currentIosEntry && restoreLink(currentIosEntry.url)}
                      disabled={!currentIosEntry || !currentIosEntry.consumedAt}
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Remettre disponible
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  Android utilise le lien fixe fourni pour le téléchargement de l’APK.
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={exportToPNG}
                  disabled={!currentQrValue}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Exporter PNG
                </button>
                <button
                  type="button"
                  onClick={exportToSVG}
                  disabled={!currentQrValue}
                  className="rounded-2xl bg-rose-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Exporter SVG
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/60 bg-slate-950 p-6 text-white shadow-[0_20px_80px_-30px_rgba(15,23,42,0.45)]">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Suivi des liens iOS</h2>
                <p className="text-sm text-slate-300">Persisté localement dans le navigateur utilisé.</p>
              </div>
              <button
                type="button"
                onClick={exportConsumedLinks}
                className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-rose-100"
              >
                Export CSV consommés
              </button>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/8 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Total</div>
                <div className="mt-2 text-3xl font-semibold">{iosLinks.length}</div>
              </div>
              <div className="rounded-2xl bg-emerald-400/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">Disponibles</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-200">{availableIosLinks.length}</div>
              </div>
              <div className="rounded-2xl bg-rose-400/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-rose-200">Consommés</div>
                <div className="mt-2 text-3xl font-semibold text-rose-100">{consumedIosLinks.length}</div>
              </div>
            </div>

            <div className="max-h-[26rem] space-y-3 overflow-auto pr-1">
              {iosLinks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/20 p-4 text-sm text-slate-300">
                  Aucun lien iOS importé pour le moment.
                </div>
              ) : (
                iosLinks.map((entry) => (
                  <div
                    key={entry.url}
                    className={`rounded-2xl border p-4 ${
                      entry.consumedAt
                        ? 'border-rose-400/30 bg-rose-400/10'
                        : 'border-white/10 bg-white/6'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">
                          {entry.code || 'Lien sans code détecté'}
                        </div>
                        <div className="mt-1 break-all font-mono text-xs text-slate-300">{entry.url}</div>
                      </div>
                      <div
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                          entry.consumedAt ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
                        }`}
                      >
                        {entry.consumedAt ? 'Consommé' : 'Disponible'}
                      </div>
                    </div>
                    {entry.consumedAt ? (
                      <div className="mt-3 text-xs text-slate-300">
                        Consommé le {new Date(entry.consumedAt).toLocaleString('fr-FR')}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
