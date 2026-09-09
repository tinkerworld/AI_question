import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../config/api';
import { getAuthHeaders } from '../../utils/api';
import { useI18n, LanguageInfo } from '../../context/I18nContext';

interface TranslationKeyInfo {
  id: string;
  key: string;
  description?: string;
  module?: string;
  baseValue?: string;
}

export interface BulkImportItem {
  filename: string;
  status: 'queued' | 'importing' | 'done' | 'failed';
  languageCode?: string;
  languageName?: string;
  updatedCount?: number;
  skippedCount?: number;
  unknownKeys?: string[];
  error?: string;
}

export interface BulkImportSummary {
  totalFiles: number;
  successCount: number;
  failedCount: number;
  items: BulkImportItem[];
}

// Derive language code from filename (e.g. translations-hi.csv -> hi, translations_bn.json -> bn)
export function extractLanguageCodeFromFilename(filename: string): string | null {
  const base = filename.replace(/^.*[\\\/]/, '').trim();
  const match = base.match(/^translations?[-_]([a-zA-Z0-9_-]+)\.(csv|json)$/i);
  if (match && match[1]) {
    return match[1].toLowerCase().trim();
  }
  const simple = base.match(/^([a-zA-Z]{2,5}(?:-[a-zA-Z0-9]+)?)\.(csv|json)$/i);
  if (simple && simple[1]) {
    return simple[1].toLowerCase().trim();
  }
  return null;
}

// Client-side CSV parser helper
export function parseCsvRows(csvText: string): string[][] {
  const cleanText = csvText.replace(/^﻿/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell);
        if (currentRow.some((c) => c.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else if (char === '\r') {
        // Skip CR
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some((c) => c.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export const LanguageManagementPanel: React.FC = () => {
  const {
    availableLanguages,
    refreshLanguages,
    refreshTranslations,
    currentLanguage,
    setLanguage,
  } = useI18n();

  // Languages list state
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState<boolean>(true);
  const [langSearch, setLangSearch] = useState<string>('');
  const [langStatusFilter, setLangStatusFilter] = useState<'ALL' | 'COMPLETE' | 'INCOMPLETE'>('ALL');

  // Selected language for translation management
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageInfo | null>(null);
  const [allKeys, setAllKeys] = useState<TranslationKeyInfo[]>([]);
  const [translationsMap, setTranslationsMap] = useState<Record<string, string>>({});
  const [loadingTranslations, setLoadingTranslations] = useState<boolean>(false);
  const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>({});

  // Import / Export State
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{ updatedCount: number; skippedCount: number; unknownKeys: string[]; languageCode?: string } | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [batchTranslating, setBatchTranslating] = useState<boolean>(false);

  // Bulk Import All State
  const [showBulkImportModal, setShowBulkImportModal] = useState<boolean>(false);
  const [bulkImporting, setBulkImporting] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<BulkImportItem[]>([]);
  const [bulkSummary, setBulkSummary] = useState<BulkImportSummary | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Translation editing & filtering state
  const [keyFilterTab, setKeyFilterTab] = useState<'ALL' | 'MISSING' | 'TRANSLATED'>('ALL');
  const [keySearch, setKeySearch] = useState<string>('');
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, { success?: boolean; message?: string } | undefined>>({});

  // Add Language Modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCode, setNewCode] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newNativeName, setNewNativeName] = useState<string>('');
  const [newIsDefault, setNewIsDefault] = useState<boolean>(false);
  const [addingLanguage, setAddingLanguage] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Global alerts
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Fetch languages with completeness data
  const loadLanguages = async () => {
    setLoadingLanguages(true);
    try {
      const res = await fetch(`${API_BASE}/i18n/languages`, {
        headers: getAuthHeaders(),
      });
      const body = await res.json();
      if (body.success && Array.isArray(body.data)) {
        setLanguages(body.data);
        if (!selectedLanguage && body.data.length > 0) {
          const defaultLang = body.data.find((l: LanguageInfo) => l.code === 'en') || body.data[0];
          setSelectedLanguage(defaultLang);
        }
      }
    } catch (err: any) {
      setBannerError(err.message || 'Failed to fetch languages');
    } finally {
      setLoadingLanguages(false);
    }
  };

  // Fetch all system translation keys
  const loadKeys = async () => {
    try {
      const res = await fetch(`${API_BASE}/i18n/keys`, {
        headers: getAuthHeaders(),
      });
      const body = await res.json();
      if (body.success && Array.isArray(body.data)) {
        setAllKeys(body.data);
      }
    } catch (err) {
      console.warn('Could not load translation keys metadata');
    }
  };

  // Fetch translation dictionary for selected language
  const loadLanguageTranslations = async (code: string) => {
    setLoadingTranslations(true);
    try {
      const res = await fetch(`${API_BASE}/i18n/translations/${code}`, {
        headers: getAuthHeaders(),
      });
      const body = await res.json();
      if (body.success && body.data) {
        // Use dbTranslations to accurately identify explicit translations vs gaps
        const dict = body.data.dbTranslations || {};
        setTranslationsMap(dict);
        setVerifiedMap(body.data.verifiedMap || {});

        // Pre-fill editable state
        const initialEdits: Record<string, string> = {};
        allKeys.forEach((k) => {
          initialEdits[k.key] = dict[k.key] ?? '';
        });
        setEditingValues(initialEdits);
      }
    } catch (err: any) {
      setBannerError(err.message || 'Failed to load translations for ' + code);
    } finally {
      setLoadingTranslations(false);
    }
  };

  useEffect(() => {
    loadLanguages();
    loadKeys();
  }, []);

  useEffect(() => {
    if (selectedLanguage) {
      loadLanguageTranslations(selectedLanguage.code);
    }
  }, [selectedLanguage?.code, allKeys.length]);

  // Handle saving a single translation key
  const handleSaveTranslation = async (keyStr: string) => {
    if (!selectedLanguage) return;
    const value = editingValues[keyStr];
    if (value === undefined) return;

    setSavingKey((prev) => ({ ...prev, [keyStr]: true }));
    setSaveStatus((prev) => ({ ...prev, [keyStr]: undefined }));
    setBannerError(null);
    setBannerSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/i18n/translations`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          languageCode: selectedLanguage.code,
          key: keyStr,
          value: value.trim(),
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.message || 'Failed to save translation');
      }

      setSaveStatus((prev) => ({
        ...prev,
        [keyStr]: { success: true, message: 'Saved ✓' },
      }));

      // Update in-memory dictionary and mark as verified
      setTranslationsMap((prev) => ({
        ...prev,
        [keyStr]: value.trim(),
      }));
      setVerifiedMap((prev) => ({
        ...prev,
        [keyStr]: true,
      }));

      // Refresh global I18n Context so UI reflects changes immediately
      await refreshLanguages();
      if (selectedLanguage.code === currentLanguage) {
        await refreshTranslations(currentLanguage);
      }

      // Re-fetch language completeness stats
      loadLanguages();

      setTimeout(() => {
        setSaveStatus((prev) => ({
          ...prev,
          [keyStr]: undefined,
        }));
      }, 3000);
    } catch (err: any) {
      setSaveStatus((prev) => ({
        ...prev,
        [keyStr]: { success: false, message: err.message || 'Failed to save' },
      }));
    } finally {
      setSavingKey((prev) => ({ ...prev, [keyStr]: false }));
    }
  };

  // Handle creating a new language
  const handleCreateLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim() || !newNativeName.trim()) {
      setAddError('Please fill in language code, name, and native display name.');
      return;
    }

    setAddingLanguage(true);
    setAddError(null);

    try {
      const res = await fetch(`${API_BASE}/i18n/languages`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: newCode.trim().toLowerCase(),
          name: newName.trim(),
          nativeName: newNativeName.trim(),
          isDefault: newIsDefault,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.message || 'Failed to register language');
      }

      setBannerSuccess(`Successfully registered language "${newName}" (${newCode.toLowerCase()})!`);
      setShowAddModal(false);
      setNewCode('');
      setNewName('');
      setNewNativeName('');
      setNewIsDefault(false);

      // Refresh languages list & global context
      await refreshLanguages();
      await loadLanguages();

      // Select the newly created language
      setSelectedLanguage({
        code: body.data.code,
        name: body.data.name,
        nativeName: body.data.nativeName,
        isDefault: body.data.isDefault,
        translatedCount: 0,
        totalKeys: allKeys.length,
      });
      setKeyFilterTab('MISSING');
    } catch (err: any) {
      setAddError(err.message || 'Failed to register new language');
    } finally {
      setAddingLanguage(false);
    }
  };


  // Handle Export Language (JSON or CSV)
  const handleExportLanguage = async (format: 'json' | 'csv') => {
    if (!selectedLanguage) return;
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/i18n/export/${selectedLanguage.code}?format=${format}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Export failed');

      if (format === 'csv') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translations-${selectedLanguage.code}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const body = await res.json();
        const blob = new Blob([JSON.stringify(body.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translations-${selectedLanguage.code}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      setBannerSuccess(`Successfully exported ${selectedLanguage.name} translations (${format.toUpperCase()})`);
    } catch (err: any) {
      setBannerError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Handle Export All (Backup)
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/i18n/export/all?format=json`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Backup export failed');
      const body = await res.json();
      const blob = new Blob([JSON.stringify(body.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translations-all-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      setBannerSuccess('Full platform translation backup exported successfully!');
    } catch (err: any) {
      setBannerError(err.message || 'Backup export failed');
    } finally {
      setExporting(false);
    }
  };

  // Handle Trigger Import All (open file dialog with multiple files enabled)
  const handleTriggerImportAll = () => {
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = '';
      bulkFileInputRef.current.click();
    }
  };

  // Handle Bulk Files Selected & Sequential Import
  const handleBulkFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setShowBulkImportModal(true);
    setBulkImporting(true);
    setBulkSummary(null);

    const initialItems: BulkImportItem[] = files.map((f) => ({
      filename: f.name,
      status: 'queued',
    }));
    setBulkProgress(initialItems);

    const items: BulkImportItem[] = [...initialItems];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      items[i] = { ...items[i], status: 'importing' };
      setBulkProgress([...items]);

      try {
        const text = await file.text();
        const cleanFilename = file.name.trim();
        const derivedCode = extractLanguageCodeFromFilename(cleanFilename);

        let payload: any = {
          filename: cleanFilename,
        };
        if (derivedCode) {
          payload.languageCode = derivedCode;
        }

        if (cleanFilename.toLowerCase().endsWith('.csv')) {
          payload.csvContent = text;
          payload.format = 'csv';
          if (!payload.languageCode) {
            const rows = parseCsvRows(text);
            if (rows.length > 0) {
              const header = rows[0].map((h) => h.toLowerCase().trim().replace(/^\uFEFF/, ''));
              const langIdx = header.findIndex(
                (h) => h === 'languagecode' || h === 'language_code' || h === 'lang' || h === 'langcode'
              );
              if (langIdx !== -1 && rows.length > 1 && rows[1][langIdx]) {
                payload.languageCode = rows[1][langIdx].trim().toLowerCase();
              } else {
                const known = availableLanguages.find((l) => header.includes(l.code.toLowerCase()));
                if (known) payload.languageCode = known.code;
              }
            }
          }
        } else {
          payload.format = 'json';
          try {
            const parsed = JSON.parse(text);
            payload.translations = parsed.translations || parsed;
            if (!payload.languageCode) {
              const code = parsed.languageCode || parsed.data?.languageCode || parsed.langCode || parsed.code;
              if (code) payload.languageCode = String(code).toLowerCase().trim();
            }
          } catch {
            throw new Error('Invalid JSON format');
          }
        }

        const res = await fetch(`${API_BASE}/i18n/import`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const body = await res.json();
        if (!res.ok || !body.success) {
          const errMsg = body.message || body.error?.message || body.error || `HTTP ${res.status} error`;
          throw new Error(errMsg);
        }

        const d = body.data;
        items[i] = {
          ...items[i],
          status: 'done',
          languageCode: d.languageCode,
          languageName: d.languageName,
          updatedCount: d.updatedCount,
          skippedCount: d.skippedCount,
          unknownKeys: d.unknownKeys || [],
        };
        successCount++;
      } catch (err: any) {
        items[i] = {
          ...items[i],
          status: 'failed',
          error: err.message || 'Import failed',
        };
        failedCount++;
      }

      setBulkProgress([...items]);
    }

    setBulkImporting(false);
    setBulkSummary({
      totalFiles: files.length,
      successCount,
      failedCount,
      items,
    });

    // Refresh currently open language translation view & languages completeness list
    if (selectedLanguage) {
      await loadLanguageTranslations(selectedLanguage.code);
    }
    await loadLanguages();
    await refreshLanguages();
    if (selectedLanguage && selectedLanguage.code === currentLanguage) {
      await refreshTranslations(currentLanguage);
    }
  };

  // Handle Import Submit
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLanguage || !importFile) {
      setImportError('Please select a valid .json or .csv translation file.');
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      const fileText = await importFile.text();
      let payload: any = { languageCode: selectedLanguage.code };

      if (importFile.name.endsWith('.csv')) {
        payload.csvContent = fileText;
      } else {
        try {
          const parsed = JSON.parse(fileText);
          payload.translations = parsed.translations || parsed;
        } catch (jsonErr) {
          throw new Error('Invalid JSON file format.');
        }
      }

      const res = await fetch(`${API_BASE}/i18n/import`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.message || 'Failed to import translations');
      }

      setImportSummary(body.data);
      // Reload translations and languages
      await loadLanguageTranslations(selectedLanguage.code);
      await loadLanguages();
      await refreshLanguages();
      if (selectedLanguage.code === currentLanguage) {
        await refreshTranslations(currentLanguage);
      }
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  // Handle Batch AI Translation Trigger
  const handleRunBatchTranslate = async () => {
    if (!selectedLanguage) return;
    setBatchTranslating(true);
    setBannerError(null);
    try {
      const res = await fetch(`${API_BASE}/i18n/translate-batch`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ languageCode: selectedLanguage.code }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.message || 'Batch translation failed');
      }
      setBannerSuccess(`Batch translation populated for ${selectedLanguage.name}!`);
      await loadLanguageTranslations(selectedLanguage.code);
      await loadLanguages();
    } catch (err: any) {
      setBannerError(err.message || 'Batch translation error');
    } finally {
      setBatchTranslating(false);
    }
  };

  // Filter languages for list view
  const filteredLanguages = languages.filter((lang) => {
    const query = langSearch.toLowerCase();
    const matchesQuery =
      lang.name.toLowerCase().includes(query) ||
      lang.nativeName.toLowerCase().includes(query) ||
      lang.code.toLowerCase().includes(query);

    const isComplete = (lang.translatedCount ?? 0) >= (lang.totalKeys ?? (allKeys.length || 10));
    if (langStatusFilter === 'COMPLETE') return matchesQuery && isComplete;
    if (langStatusFilter === 'INCOMPLETE') return matchesQuery && !isComplete;
    return matchesQuery;
  });

  // Calculate gaps for currently selected language
  const totalKeysCount = allKeys.length || 10;
  const translatedCount = Object.keys(translationsMap).length;
  const missingCount = Math.max(0, totalKeysCount - translatedCount);
  const completenessPercent = Math.min(100, Math.round((translatedCount / totalKeysCount) * 100));

  // Filter keys for key view
  const filteredKeys = allKeys.filter((k) => {
    const isTranslated = !!translationsMap[k.key] && translationsMap[k.key].trim() !== '';
    if (keyFilterTab === 'MISSING' && isTranslated) return false;
    if (keyFilterTab === 'TRANSLATED' && !isTranslated) return false;

    if (!keySearch) return true;
    const q = keySearch.toLowerCase();
    return (
      k.key.toLowerCase().includes(q) ||
      (k.baseValue && k.baseValue.toLowerCase().includes(q)) ||
      (translationsMap[k.key] && translationsMap[k.key].toLowerCase().includes(q)) ||
      (k.description && k.description.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner Alerts */}
      {bannerSuccess && (
        <div
          id="i18n-success-banner"
          data-testid="i18n-success-banner"
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid #10b981',
            color: '#10b981',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>✓ {bannerSuccess}</span>
          <button
            onClick={() => setBannerSuccess(null)}
            style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {bannerError && (
        <div
          id="i18n-error-banner"
          data-testid="i18n-error-banner"
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>✗ {bannerError}</span>
          <button
            onClick={() => setBannerError(null)}
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* LEFT COLUMN: Registered Languages List & Completeness Overview */}
        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🌐</span>
                <span>System Languages</span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: '#06b6d4',
                    fontFamily: 'JetBrains Mono',
                  }}
                >
                  {languages.length}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                All registered UI locale packs
              </div>
            </div>

            {/* Add Language Button */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                id="btn-export-all-backup"
                data-testid="btn-export-all-backup"
                type="button"
                onClick={handleExportAll}
                disabled={exporting}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '11px',
                  cursor: exporting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Export All Languages Backup (JSON)"
              >
                <span>💾</span>
                <span>Backup All</span>
              </button>
              <button
                id="btn-import-all"
                data-testid="btn-import-all"
                type="button"
                onClick={handleTriggerImportAll}
                disabled={bulkImporting}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid #10b981',
                  color: '#10b981',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: bulkImporting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Import All (Select multiple .csv or .json translation files)"
              >
                <span>📥</span>
                <span>Import All</span>
              </button>
              <input
                type="file"
                id="bulk-import-file-input"
                data-testid="bulk-import-file-input"
                ref={bulkFileInputRef}
                multiple
                accept=".csv,.json"
                style={{ display: 'none' }}
                onChange={handleBulkFilesSelected}
              />
              <button
              id="btn-add-language"
              data-testid="btn-add-language"
              onClick={() => {
                setAddError(null);
                setShowAddModal(true);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: '#06b6d4',
                border: 'none',
                color: '#000',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'opacity 0.15s ease',
              }}
            >
              <span>+</span>
              <span>Add Language</span>
            </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="text"
              id="language-search-input"
              data-testid="language-search-input"
              placeholder="Search languages by name or code..."
              value={langSearch}
              onChange={(e) => setLangSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {/* Quick Status Filter Pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'COMPLETE', label: '100% Complete' },
                  { id: 'INCOMPLETE', label: 'Has Gaps' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLangStatusFilter(f.id)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    border: '1px solid',
                    borderColor: langStatusFilter === f.id ? '#06b6d4' : 'var(--border-color)',
                    background: langStatusFilter === f.id ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                    color: langStatusFilter === f.id ? '#06b6d4' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Languages Scroll List */}
          <div
            id="languages-list-container"
            data-testid="languages-list-container"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '650px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {loadingLanguages ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>
                Loading languages...
              </div>
            ) : filteredLanguages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>
                No languages found matching "{langSearch}"
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = selectedLanguage?.code === lang.code;
                const total = lang.totalKeys || totalKeysCount;
                const count = lang.translatedCount ?? 0;
                const pct = Math.min(100, Math.round((count / total) * 100));
                const isComplete = count >= total;

                return (
                  <div
                    key={lang.code}
                    id={`language-card-${lang.code}`}
                    data-testid={`language-row-${lang.code}`}
                    onClick={() => setSelectedLanguage(lang)}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      border: isSelected ? '1px solid #06b6d4' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* Language Header Line */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{lang.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({lang.nativeName})</span>
                        {lang.isDefault && (
                          <span
                            style={{
                              fontSize: '10px',
                              background: 'rgba(245, 158, 11, 0.2)',
                              color: '#f59e0b',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                            }}
                          >
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: '11px',
                          color: '#06b6d4',
                          background: 'rgba(6, 182, 212, 0.15)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                        }}
                      >
                        {lang.code}
                      </span>
                    </div>

                    {/* Completeness Bar & Indicator */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span
                          id={`completeness-text-${lang.code}`}
                          data-testid={`language-completeness-${lang.code}`}
                          style={{
                            fontWeight: 'bold',
                            color: isComplete ? '#10b981' : '#f59e0b',
                          }}
                        >
                          {count} / {total} keys translated ({pct}%)
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              color: isComplete ? '#10b981' : '#f59e0b',
                              fontSize: '10px',
                              fontWeight: 'bold',
                            }}
                          >
                            {isComplete ? 'Complete ✓' : `${total - count} missing`}
                          </span>
                          {(lang.unverifiedCount ?? 0) > 0 ? (
                            <span
                              id={`unverified-badge-${lang.code}`}
                              data-testid={`unverified-badge-${lang.code}`}
                              style={{
                                fontSize: '10px',
                                color: '#f59e0b',
                                background: 'rgba(245, 158, 11, 0.15)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                              }}
                              title="Translations generated by AI needing review"
                            >
                              ⚠️ {lang.unverifiedCount} unverified
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', color: '#10b981' }}>✓ Verified</span>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '5px',
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: isComplete ? '#10b981' : '#f59e0b',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Manage Translations Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                      <button
                        type="button"
                        id={`btn-manage-${lang.code}`}
                        data-testid={`btn-manage-${lang.code}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLanguage(lang);
                        }}
                        style={{
                          padding: '3px 10px',
                          borderRadius: '4px',
                          border: isSelected ? '1px solid #06b6d4' : '1px solid var(--border-color)',
                          background: isSelected ? '#06b6d4' : 'transparent',
                          color: isSelected ? '#000' : 'var(--text-muted)',
                          fontSize: '11px',
                          fontWeight: isSelected ? 'bold' : 'normal',
                          cursor: 'pointer',
                        }}
                      >
                        {isSelected ? 'Editing Now →' : 'Edit Translations'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Translation Workspace & Gap Finder */}
        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {selectedLanguage ? (
            <>
              {/* Selected Language Header */}
              <div
                id="selected-lang-header"
                data-testid="selected-lang-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '16px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                      {selectedLanguage.name} ({selectedLanguage.nativeName})
                    </h2>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono',
                        background: 'rgba(6, 182, 212, 0.15)',
                        color: '#06b6d4',
                        fontWeight: 'bold',
                      }}
                    >
                      {selectedLanguage.code}
                    </span>
                    {selectedLanguage.isDefault && (
                      <span
                        style={{
                          fontSize: '11px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#f59e0b',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                        }}
                      >
                        Default System Language
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Completeness: <strong style={{ color: completenessPercent === 100 ? '#10b981' : '#f59e0b' }}>
                      {translatedCount} / {totalKeysCount} keys translated ({completenessPercent}%)
                    </strong>
                    {missingCount > 0 ? (
                      <span style={{ color: '#f59e0b', marginLeft: '8px' }}>
                        • {missingCount} key{missingCount > 1 ? 's' : ''} missing translation!
                      </span>
                    ) : (
                      <span style={{ color: '#10b981', marginLeft: '8px' }}>
                        • Fully translated!
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick actions for selected language */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  {/* Export Dropdown / Buttons */}
                  <button
                    type="button"
                    id="btn-export-json"
                    data-testid="btn-export-json"
                    onClick={() => handleExportLanguage('json')}
                    disabled={exporting}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Export translations as JSON"
                  >
                    <span>📥</span>
                    <span>Export JSON</span>
                  </button>

                  <button
                    type="button"
                    id="btn-export-csv"
                    data-testid="btn-export-csv"
                    onClick={() => handleExportLanguage('csv')}
                    disabled={exporting}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'var(--text-main)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Export translations as CSV with UTF-8 BOM"
                  >
                    <span>📊</span>
                    <span>Export CSV</span>
                  </button>

                  {/* Import Button */}
                  <button
                    type="button"
                    id="btn-import-translations"
                    data-testid="btn-import-translations"
                    onClick={() => {
                      setImportError(null);
                      setImportSummary(null);
                      setImportFile(null);
                      setShowImportModal(true);
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #10b981',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#10b981',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>📤</span>
                    <span>Import</span>
                  </button>

                  {/* Batch AI Translate */}
                  {selectedLanguage.code !== 'en' && (
                    <button
                      type="button"
                      id="btn-ai-translate-batch"
                      data-testid="btn-ai-translate-batch"
                      onClick={handleRunBatchTranslate}
                      disabled={batchTranslating}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #6366f1',
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: '#818cf8',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: batchTranslating ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Run AI Batch Translation for this language"
                    >
                      <span>⚡</span>
                      <span>{batchTranslating ? 'Translating...' : 'AI Auto-Fill'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    id="btn-preview-in-app"
                    data-testid="btn-preview-in-app"
                    onClick={() => {
                      setLanguage(selectedLanguage.code);
                      setBannerSuccess(`Switched active interface language to "${selectedLanguage.name}" (${selectedLanguage.code})!`);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #8b5cf6',
                      background: 'rgba(139, 92, 246, 0.15)',
                      color: '#8b5cf6',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>👁️</span>
                    <span>Set Active UI Language</span>
                  </button>
                </div>
              </div>

              {/* Translation Filter & Search Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    id="filter-all-keys"
                    data-testid="filter-all-keys"
                    onClick={() => setKeyFilterTab('ALL')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: keyFilterTab === 'ALL' ? '#06b6d4' : 'var(--border-color)',
                      background: keyFilterTab === 'ALL' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                      color: keyFilterTab === 'ALL' ? '#06b6d4' : 'var(--text-main)',
                      fontSize: '12px',
                      fontWeight: keyFilterTab === 'ALL' ? 'bold' : 'normal',
                      cursor: 'pointer',
                    }}
                  >
                    All Keys ({allKeys.length})
                  </button>

                  <button
                    type="button"
                    id="filter-missing-keys"
                    data-testid="filter-missing-keys"
                    onClick={() => setKeyFilterTab('MISSING')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: keyFilterTab === 'MISSING' ? '#f59e0b' : 'var(--border-color)',
                      background: keyFilterTab === 'MISSING' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                      color: keyFilterTab === 'MISSING' ? '#f59e0b' : 'var(--text-main)',
                      fontSize: '12px',
                      fontWeight: keyFilterTab === 'MISSING' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>⚠️ Missing Keys (Gap Finder)</span>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: missingCount > 0 ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                        color: missingCount > 0 ? '#000' : 'var(--text-muted)',
                        fontSize: '10px',
                        fontWeight: 'bold',
                      }}
                    >
                      {missingCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    id="filter-translated-keys"
                    data-testid="filter-translated-keys"
                    onClick={() => setKeyFilterTab('TRANSLATED')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: keyFilterTab === 'TRANSLATED' ? '#10b981' : 'var(--border-color)',
                      background: keyFilterTab === 'TRANSLATED' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      color: keyFilterTab === 'TRANSLATED' ? '#10b981' : 'var(--text-main)',
                      fontSize: '12px',
                      fontWeight: keyFilterTab === 'TRANSLATED' ? 'bold' : 'normal',
                      cursor: 'pointer',
                    }}
                  >
                    Translated ({translatedCount})
                  </button>
                </div>

                {/* Key Search Input */}
                <input
                  type="text"
                  id="key-search-input"
                  data-testid="key-search-input"
                  placeholder="Filter keys or text..."
                  value={keySearch}
                  onChange={(e) => setKeySearch(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    minWidth: '220px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Translation Keys List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {loadingTranslations ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Loading translations...
                  </div>
                ) : filteredKeys.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px dashed var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-muted)',
                      fontSize: '13px',
                    }}
                  >
                    {keyFilterTab === 'MISSING'
                      ? `🎉 Awesome! No missing translation keys for ${selectedLanguage.name}. All ${allKeys.length} keys are translated!`
                      : 'No translation keys match your filter.'}
                  </div>
                ) : (
                  filteredKeys.map((keyInfo) => {
                    const isTranslated = !!translationsMap[keyInfo.key] && translationsMap[keyInfo.key].trim() !== '';
                    const isSaving = savingKey[keyInfo.key];
                    const status = saveStatus[keyInfo.key];
                    const currentValue = editingValues[keyInfo.key] ?? '';
                    const hasChanged = currentValue !== (translationsMap[keyInfo.key] ?? '');

                    return (
                      <div
                        key={keyInfo.key}
                        id={`key-card-${keyInfo.key}`}
                        data-testid={`key-card-${keyInfo.key}`}
                        style={{
                          background: isTranslated ? 'rgba(255,255,255,0.02)' : 'rgba(245, 158, 11, 0.04)',
                          border: isTranslated ? '1px solid var(--border-color)' : '1px solid rgba(245, 158, 11, 0.4)',
                          borderRadius: '8px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          transition: 'border-color 0.2s ease',
                        }}
                      >
                        {/* Key Header Line */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontFamily: 'JetBrains Mono',
                                fontWeight: 'bold',
                                fontSize: '13px',
                                color: '#06b6d4',
                              }}
                            >
                              {keyInfo.key}
                            </span>
                            {keyInfo.module && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(255,255,255,0.06)',
                                  color: 'var(--text-muted)',
                                  fontFamily: 'JetBrains Mono',
                                }}
                              >
                                {keyInfo.module}
                              </span>
                            )}
                            {keyInfo.description && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                — {keyInfo.description}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isTranslated ? (
                              <>
                                <span
                                  id={`badge-translated-${keyInfo.key}`}
                                  style={{
                                    fontSize: '11px',
                                    color: '#10b981',
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  Translated ✓
                                </span>
                                {verifiedMap[keyInfo.key] ? (
                                  <span
                                    id={`badge-verified-${keyInfo.key}`}
                                    data-testid={`badge-verified-${keyInfo.key}`}
                                    style={{
                                      fontSize: '10px',
                                      color: '#10b981',
                                      background: 'rgba(16, 185, 129, 0.2)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    Verified ✓
                                  </span>
                                ) : (
                                  <span
                                    id={`badge-unverified-${keyInfo.key}`}
                                    data-testid={`badge-unverified-${keyInfo.key}`}
                                    style={{
                                      fontSize: '10px',
                                      color: '#f59e0b',
                                      background: 'rgba(245, 158, 11, 0.2)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    AI-generated ⚠️
                                  </span>
                                )}
                              </>
                            ) : (
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: '#f59e0b',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                }}
                              >
                                ⚠️ Missing Translation
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Reference & Editing Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                          {/* English Reference Field */}
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                              Base English Reference:
                            </label>
                            <div
                              id={`trans-base-${keyInfo.key}`}
                              data-testid={`trans-base-${keyInfo.key}`}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                background: 'rgba(0,0,0,0.25)',
                                border: '1px solid var(--border-color)',
                                fontSize: '13px',
                                color: 'var(--text-muted)',
                                minHeight: '38px',
                                display: 'flex',
                                alignItems: 'center',
                                wordBreak: 'break-word',
                              }}
                            >
                              {keyInfo.baseValue || keyInfo.key}
                            </div>
                          </div>

                          {/* Target Language Value Input */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {selectedLanguage.name} Translation:
                              </label>
                              {hasChanged && (
                                <span style={{ fontSize: '10px', color: '#06b6d4', fontWeight: 'bold' }}>
                                  Unsaved Edits
                                </span>
                              )}
                            </div>
                            <input
                              type="text"
                              id={`trans-input-${keyInfo.key}`}
                              data-testid={`trans-input-${keyInfo.key}`}
                              value={currentValue}
                              placeholder={isTranslated ? '' : `Enter ${selectedLanguage.name} translation...`}
                              onChange={(e) =>
                                setEditingValues((prev) => ({
                                  ...prev,
                                  [keyInfo.key]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveTranslation(keyInfo.key);
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: hasChanged
                                  ? '1px solid #06b6d4'
                                  : !isTranslated
                                  ? '1px solid rgba(245, 158, 11, 0.6)'
                                  : '1px solid var(--border-color)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-main)',
                                fontSize: '13px',
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>
                        </div>

                        {/* Card Action Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                          <div style={{ fontSize: '11px' }}>
                            {status && (
                              <span
                                id={`trans-status-${keyInfo.key}`}
                                data-testid={`trans-status-${keyInfo.key}`}
                                style={{
                                  color: status.success ? '#10b981' : '#ef4444',
                                  fontWeight: 'bold',
                                }}
                              >
                                {status.message}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            id={`btn-save-${keyInfo.key}`}
                            data-testid={`btn-save-${keyInfo.key}`}
                            disabled={isSaving}
                            onClick={() => handleSaveTranslation(keyInfo.key)}
                            style={{
                              padding: '6px 16px',
                              borderRadius: '4px',
                              background: '#06b6d4',
                              border: 'none',
                              color: '#000',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: isSaving ? 'not-allowed' : 'pointer',
                              opacity: isSaving ? 0.7 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {isSaving ? (
                              <span>Saving...</span>
                            ) : (
                              <>
                                <span>💾</span>
                                <span>Save</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Select a language from the left column to inspect and edit translations.
            </div>
          )}
        </div>
      </div>

      {/* Add New System Language Modal */}
      {showAddModal && (
        <div
          id="add-language-modal"
          data-testid="add-language-modal"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '24px',
              width: '460px',
              maxWidth: '90vw',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🌐</span>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Register New System Language</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {addError && (
              <div
                id="add-language-error"
                data-testid="add-language-error"
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  fontSize: '12px',
                }}
              >
                {addError}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleCreateLanguage} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Language Code (ISO 639-1 / BCP 47) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  id="new-lang-code"
                  data-testid="new-lang-code"
                  placeholder="e.g. es, de, fr, te-IN"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                  Unique lowercase identifier (e.g. "es" for Spanish, "de" for German)
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Display Name (English) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  id="new-lang-name"
                  data-testid="new-lang-name"
                  placeholder="e.g. Spanish"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Native Display Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  id="new-lang-nativename"
                  data-testid="new-lang-nativename"
                  placeholder="e.g. Español"
                  value={newNativeName}
                  onChange={(e) => setNewNativeName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="new-lang-isdefault"
                  data-testid="new-lang-isdefault"
                  checked={newIsDefault}
                  onChange={(e) => setNewIsDefault(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="new-lang-isdefault" style={{ fontSize: '12px', cursor: 'pointer' }}>
                  Set as system default fallback language
                </label>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  id="btn-cancel-new-language"
                  data-testid="btn-cancel-new-language"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-new-language"
                  data-testid="btn-submit-new-language"
                  disabled={addingLanguage}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    background: '#06b6d4',
                    border: 'none',
                    color: '#000',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: addingLanguage ? 'not-allowed' : 'pointer',
                    opacity: addingLanguage ? 0.7 : 1,
                  }}
                >
                  {addingLanguage ? 'Registering...' : 'Register Language'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Translations Modal */}
      {showImportModal && (
        <div
          id="import-translations-modal"
          data-testid="import-translations-modal"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '24px',
              width: '520px',
              maxWidth: '90vw',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📤</span>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                  Import Translations ({selectedLanguage?.name} - {selectedLanguage?.code})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportSummary(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {importError && (
              <div
                id="import-error-msg"
                data-testid="import-error-msg"
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  fontSize: '12px',
                }}
              >
                {importError}
              </div>
            )}

            {/* Import Summary Results Modal Content */}
            {importSummary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  id="import-summary-banner"
                  data-testid="import-summary-banner"
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid #10b981',
                    color: '#10b981',
                    fontSize: '13px',
                  }}
                >
                  🎉 <strong>Import Completed!</strong>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1, padding: '12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{importSummary.updatedCount}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Keys Updated</div>
                  </div>
                  <div style={{ flex: 1, padding: '12px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.1)', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>{importSummary.skippedCount}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Keys Skipped</div>
                  </div>
                </div>

                {importSummary.unknownKeys && importSummary.unknownKeys.length > 0 && (
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                    <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '4px' }}>
                      Skipped Unknown Keys (not in translation_keys schema):
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {importSummary.unknownKeys.join(', ')}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  id="btn-close-import-summary"
                  data-testid="btn-close-import-summary"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportSummary(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: '#06b6d4',
                    color: '#000',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    alignSelf: 'flex-end',
                    marginTop: '8px',
                  }}
                >
                  Done & Refresh View
                </button>
              </div>
            ) : (
              <form onSubmit={handleImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Upload a <code>.json</code> or <code>.csv</code> translation export file. Human-supplied translations are automatically marked as <strong>Verified ✓</strong>. Unknown keys are safely skipped.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Select Translation File (.json or .csv):
                  </label>
                  <input
                    type="file"
                    id="import-file-input"
                    data-testid="import-file-input"
                    accept=".json,.csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImportFile(e.target.files[0]);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'transparent',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-import"
                    data-testid="btn-submit-import"
                    disabled={importing || !importFile}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      background: '#10b981',
                      border: 'none',
                      color: '#000',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: importing || !importFile ? 'not-allowed' : 'pointer',
                      opacity: importing || !importFile ? 0.7 : 1,
                    }}
                  >
                    {importing ? 'Importing...' : 'Upload & Import'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Bulk Import All Modal */}
      {showBulkImportModal && (
        <div
          id="bulk-import-modal-overlay"
          data-testid="bulk-import-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            id="bulk-import-modal"
            data-testid="bulk-import-modal"
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '24px',
              width: '680px',
              maxWidth: '92vw',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📥</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                    Bulk Import Translations
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Sequential multi-file import ({bulkProgress.length} file{bulkProgress.length === 1 ? '' : 's'} selected)
                  </div>
                </div>
              </div>
              {!bulkImporting && (
                <button
                  type="button"
                  id="btn-close-bulk-import-x"
                  data-testid="btn-close-bulk-import-x"
                  onClick={() => {
                    setShowBulkImportModal(false);
                    setBulkSummary(null);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Progress Bar Header */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  {bulkImporting ? 'Processing files sequentially...' : 'Import process completed'}
                </span>
                <span style={{ fontWeight: 'bold', fontFamily: 'JetBrains Mono' }}>
                  {bulkProgress.filter((p) => p.status === 'done' || p.status === 'failed').length} / {bulkProgress.length}
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${bulkProgress.length > 0 ? ((bulkProgress.filter((p) => p.status === 'done' || p.status === 'failed').length) / bulkProgress.length) * 100 : 0}%`,
                    background: bulkSummary && bulkSummary.failedCount > 0 ? '#f59e0b' : '#10b981',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>

            {/* Live Progress List */}
            <div
              id="bulk-import-progress-list"
              data-testid="bulk-import-progress-list"
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px',
                maxHeight: '300px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {bulkProgress.map((item, idx) => (
                <div
                  key={idx}
                  id={`bulk-import-item-${idx}`}
                  data-testid={`bulk-import-item-${idx}`}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: item.status === 'importing' ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${
                      item.status === 'done'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : item.status === 'failed'
                        ? 'rgba(239, 68, 68, 0.3)'
                        : item.status === 'importing'
                        ? 'rgba(6, 182, 212, 0.5)'
                        : 'var(--border-color)'
                    }`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    {item.status === 'queued' && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                        ⏳ Queued
                      </span>
                    )}
                    {item.status === 'importing' && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', fontWeight: 'bold' }}>
                        🔄 Importing...
                      </span>
                    )}
                    {item.status === 'done' && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 'bold' }}>
                        ✓ Done
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 'bold' }}>
                        ✗ Failed
                      </span>
                    )}

                    <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.filename}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', textAlign: 'right' }}>
                    {item.status === 'done' && (
                      <span style={{ color: '#10b981' }}>
                        {item.languageName ? `${item.languageName} (${item.languageCode}): ` : ''}
                        <strong>{item.updatedCount}</strong> updated
                        {item.skippedCount ? `, ${item.skippedCount} skipped` : ''}
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span style={{ color: '#ef4444' }} title={item.error}>
                        {item.error || 'Failed'}
                      </span>
                    )}
                    {item.status === 'queued' && <span style={{ color: 'var(--text-muted)' }}>Waiting...</span>}
                    {item.status === 'importing' && <span style={{ color: '#06b6d4' }}>Reading & upserting...</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Section at the End */}
            {bulkSummary && (
              <div
                id="bulk-import-summary"
                data-testid="bulk-import-summary"
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  background:
                    bulkSummary.failedCount === 0
                      ? 'rgba(16, 185, 129, 0.12)'
                      : bulkSummary.successCount > 0
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'rgba(239, 68, 68, 0.12)',
                  border: `1px solid ${
                    bulkSummary.failedCount === 0
                      ? '#10b981'
                      : bulkSummary.successCount > 0
                      ? '#f59e0b'
                      : '#ef4444'
                  }`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{bulkSummary.failedCount === 0 ? '🎉' : '⚠️'}</span>
                  <span>
                    Bulk Import Summary: {bulkSummary.successCount} language{bulkSummary.successCount === 1 ? '' : 's'} imported successfully
                    {bulkSummary.failedCount > 0 && `, ${bulkSummary.failedCount} failed`}
                  </span>
                </div>

                {bulkSummary.failedCount > 0 && (
                  <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                    <strong>Failed files:</strong>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                      {bulkSummary.items
                        .filter((i) => i.status === 'failed')
                        .map((i, idx) => (
                          <li key={idx}>
                            <code>{i.filename}</code>: {i.error}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer / Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                id="btn-close-bulk-import"
                data-testid="btn-close-bulk-import"
                disabled={bulkImporting}
                onClick={() => {
                  setShowBulkImportModal(false);
                  setBulkSummary(null);
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  background: bulkImporting ? 'rgba(255,255,255,0.05)' : '#06b6d4',
                  color: bulkImporting ? 'var(--text-muted)' : '#000',
                  fontWeight: 'bold',
                  border: 'none',
                  fontSize: '12px',
                  cursor: bulkImporting ? 'not-allowed' : 'pointer',
                }}
              >
                {bulkImporting ? 'Importing in Progress...' : 'Done & Close'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
