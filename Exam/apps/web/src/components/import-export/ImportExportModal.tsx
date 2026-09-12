import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileCheck,
  AlertCircle,
  X,
  FileText,
  Layers,
  CheckCircle2,
  RefreshCw,
  Copy,
} from 'lucide-react';
import {
  ImportExportEntityType,
  ConflictResolutionStrategy,
  ImportDryRunResult,
  ImportExecutionResult,
} from '@repo/types';
import { API_BASE } from '../../config/api';
import { useAuth } from '../../context/AuthContext';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
  defaultEntityType?: ImportExportEntityType;
  onSuccess?: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  token: propToken,
  defaultEntityType = 'QUESTIONS',
  onSuccess,
}) => {
  const { token: authTok } = useAuth();
  const token = propToken ?? authTok;
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [entityType, setEntityType] = useState<ImportExportEntityType>(defaultEntityType);

  // Export State
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [includeAnswerKeys, setIncludeAnswerKeys] = useState<boolean>(true);

  // Import State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [parsedPayload, setParsedPayload] = useState<any>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = useState<ImportDryRunResult | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<ConflictResolutionStrategy>('SKIP_EXISTING');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // Handle Export
  // --------------------------------------------------------------------------
  const handleDownloadExport = async () => {
    try {
      setExporting(true);
      setExportError(null);

      const endpoint =
        entityType === 'QUESTIONS'
          ? `${API_BASE}/import-export/export/questions`
          : `${API_BASE}/import-export/export/courses`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          includeAnswerKeys,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Export request failed');
      }

      const body = await res.json();
      const pkg = body.data;

      // Trigger client-side file download
      const jsonStr = JSON.stringify(pkg, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `examos-${entityType.toLowerCase()}-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err.message || 'Failed to download export JSON');
    } finally {
      setExporting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handle File Selection & Dry-Run Validation
  // --------------------------------------------------------------------------
  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setValidationError(null);
    setDryRunResult(null);
    setImportResult(null);

    if (!file.name.endsWith('.json')) {
      setValidationError('Please select a valid JSON file (*.json)');
      return;
    }

    try {
      setIsValidating(true);
      const text = await file.text();
      const json = JSON.parse(text);
      setParsedPayload(json);

      // Trigger Dry-Run validation on backend
      const res = await fetch(`${API_BASE}/import-export/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(json),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || 'Validation request failed');
      }

      setDryRunResult(body.data);
      if (body.data?.entityType) {
        setEntityType(body.data.entityType);
      }
    } catch (err: any) {
      setValidationError(err.message || 'Malformed JSON file or invalid schema format');
    } finally {
      setIsValidating(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handle Execute Import
  // --------------------------------------------------------------------------
  const handleExecuteImport = async () => {
    if (!parsedPayload || !dryRunResult) return;

    try {
      setIsImporting(true);
      setValidationError(null);

      const res = await fetch(`${API_BASE}/import-export/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...parsedPayload,
          conflictStrategy,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || 'Import execution failed');
      }

      setImportResult(body.data);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setValidationError(err.message || 'Failed to complete import batch');
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetImport = () => {
    setSelectedFile(null);
    setParsedPayload(null);
    setDryRunResult(null);
    setImportResult(null);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      id="import-export-modal-overlay"
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
        zIndex: 10000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        id="import-export-modal"
        style={{
          background: 'var(--panel-bg)',
          color: 'var(--text-main)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          width: '760px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.12)',
                color: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                Data Import & Export
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Schema-Validated JSON (v2.0) for curriculum entities
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            padding: '0 24px',
            background: 'rgba(255, 255, 255, 0.01)',
          }}
        >
          <button
            onClick={() => {
              setActiveTab('export');
              handleResetImport();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'export' ? '2px solid var(--accent-color)' : '2px solid transparent',
              color: activeTab === 'export' ? 'var(--accent-color)' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <Download style={{ width: '16px', height: '16px' }} />
            <span>Export Data</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'import' ? '2px solid var(--accent-color)' : '2px solid transparent',
              color: activeTab === 'import' ? 'var(--accent-color)' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <Upload style={{ width: '16px', height: '16px' }} />
            <span>Import Data</span>
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Entity Type Selector */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                marginBottom: '8px',
              }}
            >
              Target Entity Package
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setEntityType('QUESTIONS')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border:
                    entityType === 'QUESTIONS'
                      ? '1px solid var(--accent-color)'
                      : '1px solid var(--border-color)',
                  background:
                    entityType === 'QUESTIONS' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  color: entityType === 'QUESTIONS' ? 'var(--accent-color)' : 'var(--text-main)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  gap: '12px',
                }}
              >
                <FileText style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Question Bank</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Questions, types, marks & tags
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEntityType('COURSES')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border:
                    entityType === 'COURSES'
                      ? '1px solid var(--accent-color)'
                      : '1px solid var(--border-color)',
                  background:
                    entityType === 'COURSES' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  color: entityType === 'COURSES' ? 'var(--accent-color)' : 'var(--text-main)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  gap: '12px',
                }}
              >
                <Layers style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Course Hierarchy</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Courses, subjects & syllabus trees
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* ================================================================ */}
          {/* TAB 1: EXPORT VIEW                                               */}
          {/* ================================================================ */}
          {activeTab === 'export' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Export Schema Specification
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    Schema v2.0 Standard
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Generates a portable JSON document conforming to the ExamOS v2.0 content exchange
                  standard. Includes cryptographic integrity metadata, structured categories, and full
                  relational hierarchy.
                </p>

                {entityType === 'QUESTIONS' && (
                  <div
                    style={{
                      paddingTop: '10px',
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={includeAnswerKeys}
                        onChange={(e) => setIncludeAnswerKeys(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Include Answer Keys and Detailed Explanations</span>
                    </label>
                  </div>
                )}
              </div>

              {exportError && (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#ef4444',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                  <span>{exportError}</span>
                </div>
              )}

              <div style={{ paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleDownloadExport}
                  disabled={exporting}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    background: 'var(--accent-color)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: 'none',
                    cursor: exporting ? 'not-allowed' : 'pointer',
                    opacity: exporting ? 0.6 : 1,
                    boxShadow: '0 4px 12px rgba(6, 182, 212, 0.25)',
                  }}
                >
                  {exporting ? (
                    <>
                      <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                      <span>Generating JSON Package...</span>
                    </>
                  ) : (
                    <>
                      <Download style={{ width: '16px', height: '16px' }} />
                      <span>Download {entityType === 'QUESTIONS' ? 'Question Bank' : 'Course Hierarchy'} (JSON)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 2: IMPORT VIEW                                               */}
          {/* ================================================================ */}
          {activeTab === 'import' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!dryRunResult && !importResult && (
                <>
                  {/* Drag-and-Drop Area */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileChange(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: isDragging
                        ? '2px dashed var(--accent-color)'
                        : '2px dashed var(--border-color)',
                      background: isDragging ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '12px',
                      padding: '32px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          padding: '12px',
                          background: 'rgba(6, 182, 212, 0.12)',
                          color: 'var(--accent-color)',
                          borderRadius: '12px',
                        }}
                      >
                        <Upload style={{ width: '24px', height: '24px' }} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                          Click to upload or drag and drop
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                          Standard ExamOS JSON files (*.json)
                        </p>
                      </div>
                    </div>
                  </div>

                  {isValidating && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: 'var(--accent-color)',
                        padding: '12px 0',
                      }}
                    >
                      <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                      <span>Validating schema against ExamOS v2.0 standard...</span>
                    </div>
                  )}

                  {validationError && (
                    <div
                      style={{
                        padding: '14px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        color: '#ef4444',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      <AlertCircle style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Import Rejected</div>
                        <div>{validationError}</div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Dry-Run Preview Summary */}
              {dryRunResult && !importResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '12px',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                        Dry-Run Validation Summary
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                        File: {selectedFile?.name} ({dryRunResult.totalCount} items detected)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetImport}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-color)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '4px 8px',
                      }}
                    >
                      Choose Different File
                    </button>
                  </div>

                  {/* Status Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div
                      style={{
                        padding: '12px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>
                        Valid Items
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                        {dryRunResult.validCount}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '12px',
                        background:
                          dryRunResult.invalidCount > 0
                            ? 'rgba(239, 68, 68, 0.08)'
                            : 'rgba(255, 255, 255, 0.02)',
                        border:
                          dryRunResult.invalidCount > 0
                            ? '1px solid rgba(239, 68, 68, 0.3)'
                            : '1px solid var(--border-color)',
                        borderRadius: '10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: dryRunResult.invalidCount > 0 ? '#ef4444' : 'var(--text-muted)',
                        }}
                      >
                        Invalid Rows
                      </div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: 800,
                          color: dryRunResult.invalidCount > 0 ? '#ef4444' : 'var(--text-muted)',
                          marginTop: '4px',
                        }}
                      >
                        {dryRunResult.invalidCount}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '12px',
                        background: 'rgba(6, 182, 212, 0.08)',
                        border: '1px solid rgba(6, 182, 212, 0.25)',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-color)' }}>
                        Collisions
                      </div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: 800,
                          color: 'var(--accent-color)',
                          marginTop: '4px',
                        }}
                      >
                        {dryRunResult.collisionCount}
                      </div>
                    </div>
                  </div>

                  {/* Line-Level Errors Accordion / Table */}
                  {dryRunResult.errors.length > 0 && (
                    <div
                      style={{
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: 'rgba(239, 68, 68, 0.04)',
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 14px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <AlertCircle style={{ width: '14px', height: '14px' }} />
                          Schema & Line-Level Errors ({dryRunResult.errors.length})
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            color: '#ef4444',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                          }}
                        >
                          Skipped from import
                        </span>
                      </div>
                      <div
                        style={{
                          maxHeight: '160px',
                          overflowY: 'auto',
                          fontSize: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {dryRunResult.errors.map((err, i) => (
                          <div
                            key={i}
                            style={{
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              borderBottom:
                                i < dryRunResult.errors.length - 1
                                  ? '1px solid rgba(239, 68, 68, 0.15)'
                                  : 'none',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#ef4444',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Row #{err.index + 1}:
                            </span>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                {err.itemIdentifier}
                              </span>
                              <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>
                                [{err.path}]
                              </span>
                              <div style={{ color: '#f87171', marginTop: '2px' }}>{err.message}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conflict Resolution Strategy Selector */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Conflict Resolution Strategy ({dryRunResult.collisionCount} collisions detected)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <label
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          border:
                            conflictStrategy === 'SKIP_EXISTING'
                              ? '1px solid var(--accent-color)'
                              : '1px solid var(--border-color)',
                          background:
                            conflictStrategy === 'SKIP_EXISTING'
                              ? 'rgba(6, 182, 212, 0.12)'
                              : 'rgba(255, 255, 255, 0.02)',
                          color:
                            conflictStrategy === 'SKIP_EXISTING'
                              ? 'var(--accent-color)'
                              : 'var(--text-main)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <input
                          type="radio"
                          name="conflict"
                          value="SKIP_EXISTING"
                          checked={conflictStrategy === 'SKIP_EXISTING'}
                          onChange={() => setConflictStrategy('SKIP_EXISTING')}
                          style={{ display: 'none' }}
                        />
                        <div style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                          Skip Existing
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Keep existing items untouched
                        </div>
                      </label>

                      <label
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          border:
                            conflictStrategy === 'OVERWRITE'
                              ? '1px solid var(--accent-color)'
                              : '1px solid var(--border-color)',
                          background:
                            conflictStrategy === 'OVERWRITE'
                              ? 'rgba(6, 182, 212, 0.12)'
                              : 'rgba(255, 255, 255, 0.02)',
                          color:
                            conflictStrategy === 'OVERWRITE'
                              ? 'var(--accent-color)'
                              : 'var(--text-main)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <input
                          type="radio"
                          name="conflict"
                          value="OVERWRITE"
                          checked={conflictStrategy === 'OVERWRITE'}
                          onChange={() => setConflictStrategy('OVERWRITE')}
                          style={{ display: 'none' }}
                        />
                        <div style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <RefreshCw style={{ width: '14px', height: '14px' }} />
                          Overwrite
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Update & archive version
                        </div>
                      </label>

                      <label
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          border:
                            conflictStrategy === 'CREATE_COPY'
                              ? '1px solid var(--accent-color)'
                              : '1px solid var(--border-color)',
                          background:
                            conflictStrategy === 'CREATE_COPY'
                              ? 'rgba(6, 182, 212, 0.12)'
                              : 'rgba(255, 255, 255, 0.02)',
                          color:
                            conflictStrategy === 'CREATE_COPY'
                              ? 'var(--accent-color)'
                              : 'var(--text-main)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <input
                          type="radio"
                          name="conflict"
                          value="CREATE_COPY"
                          checked={conflictStrategy === 'CREATE_COPY'}
                          onChange={() => setConflictStrategy('CREATE_COPY')}
                          style={{ display: 'none' }}
                        />
                        <div style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Copy style={{ width: '14px', height: '14px' }} />
                          Create Copy
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Assign new unique IDs
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Confirm & Import Button */}
                  <div style={{ paddingTop: '8px' }}>
                    <button
                      type="button"
                      onClick={handleExecuteImport}
                      disabled={isImporting || dryRunResult.validCount === 0}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px 16px',
                        background: 'var(--accent-color)',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: 'none',
                        cursor: isImporting || dryRunResult.validCount === 0 ? 'not-allowed' : 'pointer',
                        opacity: isImporting || dryRunResult.validCount === 0 ? 0.6 : 1,
                        boxShadow: '0 4px 12px rgba(6, 182, 212, 0.25)',
                      }}
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                          <span>Importing Transactions...</span>
                        </>
                      ) : (
                        <>
                          <FileCheck style={{ width: '16px', height: '16px' }} />
                          <span>Confirm & Import ({dryRunResult.validCount} items)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Final Import Execution Result */}
              {importResult && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                    textAlign: 'center',
                    padding: '16px 0',
                  }}
                >
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '16px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 style={{ width: '32px', height: '32px' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Import Completed Successfully
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Batch transaction committed to PostgreSQL database
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '12px',
                      width: '100%',
                      maxWidth: '440px',
                    }}
                  >
                    <div
                      style={{
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Created</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                        {importResult.importedCount}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Updated</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-color)', marginTop: '2px' }}>
                        {importResult.updatedCount}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Skipped</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                        {importResult.skippedCount}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                    <button
                      type="button"
                      onClick={handleResetImport}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'transparent',
                        color: 'var(--text-main)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Import Another File
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--accent-color)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
