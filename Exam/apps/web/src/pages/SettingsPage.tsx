import React, { useState, useEffect } from 'react';
import { getAuthHeaders } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode } from '@repo/types';

const API_BASE = 'http://localhost:4000/api/v1';

interface AIProvider {
  id: string;
  name: string;
  type: 'MOCK' | 'LOCAL' | 'CLOUD';
  modelId: string;
  baseUrl?: string;
  apiKey?: string;
  priority: number;
  scope: string;
  isActive: boolean;
  circuitBroken?: boolean;
  failureCount?: number;
}

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [activeSubtab, setActiveSubtab] = useState<'AI' | 'APPEARANCE' | 'EXAM_THEMES'>('AI');
  const [selectedScopeFilter, setSelectedScopeFilter] = useState<'ALL' | 'question_authoring' | 'interview'>('ALL');

  // AI Configuration State
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Per-provider edit state
  const [editForms, setEditForms] = useState<Record<string, {
    modelId: string;
    baseUrl: string;
    apiKey: string;
    priority: number;
    isActive: boolean;
    showKey: boolean;
  }>>({});

  // Per-provider test connection state
  const [testResults, setTestResults] = useState<Record<string, {
    testing: boolean;
    success?: boolean;
    latencyMs?: number;
    message?: string;
  }>>({});

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoadingProviders(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/ai/gateway/providers`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load AI providers');
      }
      const provList: AIProvider[] = data.data || [];
      setProviders(provList);

      const initialForms: Record<string, any> = {};
      provList.forEach((p) => {
        initialForms[p.id] = {
          modelId: p.modelId,
          baseUrl: p.baseUrl || '',
          apiKey: p.apiKey || '',
          priority: p.priority,
          isActive: p.isActive,
          showKey: false,
        };
      });
      setEditForms(initialForms);
    } catch (err: any) {
      setError(err.message || 'Error loading providers');
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleFieldChange = (id: string, field: string, value: any) => {
    setEditForms((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSaveProvider = async (id: string) => {
    const form = editForms[id];
    if (!form) return;

    setError(null);
    setActionSuccess(null);
    try {
      const payload: any = {
        modelId: form.modelId,
        baseUrl: form.baseUrl || undefined,
        priority: Number(form.priority),
        isActive: Boolean(form.isActive),
      };

      // Only send apiKey if modified from masked placeholder
      if (form.apiKey && !form.apiKey.includes('••••') && !form.apiKey.includes('...')) {
        payload.apiKey = form.apiKey;
      }

      const res = await fetch(`${API_BASE}/ai/gateway/providers/${id}`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update provider');
      }

      setActionSuccess(`Saved settings for ${data.data.name || id}!`);
      fetchProviders();
    } catch (err: any) {
      setError(err.message || 'Failed to save provider settings');
    }
  };

  const handleTestConnection = async (id: string) => {
    const form = editForms[id];
    setTestResults((prev) => ({
      ...prev,
      [id]: { testing: true },
    }));

    try {
      const payload: any = {
        modelId: form?.modelId,
        baseUrl: form?.baseUrl,
      };
      if (form?.apiKey && !form.apiKey.includes('••••') && !form.apiKey.includes('...')) {
        payload.apiKey = form.apiKey;
      }

      const res = await fetch(`${API_BASE}/ai/gateway/providers/${id}/test`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          testing: false,
          success: data.success,
          latencyMs: data.data?.latencyMs,
          message: data.data?.message || (data.success ? 'Connection verified successfully!' : 'Connection test failed'),
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          testing: false,
          success: false,
          message: err.message || 'Connection test failed',
        },
      }));
    }
  };

  const renderProviderCard = (p: AIProvider) => {
    const form = editForms[p.id] || {
      modelId: p.modelId,
      baseUrl: p.baseUrl || '',
      apiKey: p.apiKey || '',
      priority: p.priority,
      isActive: p.isActive,
      showKey: false,
    };
    const testState = testResults[p.id];

    return (
      <div
        key={p.id}
        id={`provider-card-${p.id}`}
        data-testid={`provider-card-${p.id}`}
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Provider Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>
              {p.type === 'CLOUD' ? '☁️' : p.type === 'LOCAL' ? '🖥️' : '🎲'}
            </span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{p.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                ID: {p.id} | Type: {p.type} | Scope: <span style={{ fontFamily: 'JetBrains Mono', color: '#06b6d4' }}>{p.scope}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                id={`toggle-provider-${p.id}`}
                data-testid={`toggle-provider-${p.id}`}
                checked={form.isActive}
                onChange={(e) => handleFieldChange(p.id, 'isActive', e.target.checked)}
              />
              <span style={{ fontWeight: 600, color: form.isActive ? '#10b981' : 'var(--text-muted)' }}>
                {form.isActive ? 'Active' : 'Disabled'}
              </span>
            </label>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono',
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#06b6d4',
                fontWeight: 'bold',
              }}
            >
              Priority {form.priority}
            </span>
          </div>
        </div>

        {/* Config Form Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Priority Order (1 = highest)
            </label>
            <input
              type="number"
              id={`priority-provider-${p.id}`}
              data-testid={`priority-provider-${p.id}`}
              value={form.priority}
              onChange={(e) => handleFieldChange(p.id, 'priority', parseInt(e.target.value, 10) || 1)}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '12px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Model Identifier
            </label>
            <input
              type="text"
              id={`model-provider-${p.id}`}
              data-testid={`model-provider-${p.id}`}
              value={form.modelId}
              onChange={(e) => handleFieldChange(p.id, 'modelId', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '12px',
              }}
            />
          </div>

          {p.type !== 'MOCK' && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Base URL / Endpoint
              </label>
              <input
                type="text"
                id={`url-provider-${p.id}`}
                data-testid={`url-provider-${p.id}`}
                value={form.baseUrl}
                onChange={(e) => handleFieldChange(p.id, 'baseUrl', e.target.value)}
                placeholder={p.type === 'LOCAL' ? 'http://localhost:11434/api/generate' : 'https://api.openai.com/v1'}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                }}
              />
            </div>
          )}

          {p.type === 'CLOUD' && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                API Key (AES-256 Encrypted at Rest)
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type={form.showKey ? 'text' : 'password'}
                  id={`key-provider-${p.id}`}
                  data-testid={`key-provider-${p.id}`}
                  value={form.apiKey}
                  onChange={(e) => handleFieldChange(p.id, 'apiKey', e.target.value)}
                  placeholder="sk-..."
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleFieldChange(p.id, 'showKey', !form.showKey)}
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  {form.showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Test Connection Output */}
        {testState && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: testState.testing
                ? 'rgba(6, 182, 212, 0.1)'
                : testState.success
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
              color: testState.testing
                ? '#06b6d4'
                : testState.success
                ? '#10b981'
                : '#ef4444',
              border: `1px solid ${
                testState.testing
                  ? '#06b6d4'
                  : testState.success
                  ? '#10b981'
                  : '#ef4444'
              }`,
            }}
          >
            <span>{testState.testing ? '⏳' : testState.success ? '✓' : '⚠️'}</span>
            <span>
              {testState.testing
                ? 'Testing connection to provider endpoint...'
                : testState.message}
            </span>
            {testState.latencyMs !== undefined && (
              <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>
                Latency: {testState.latencyMs}ms
              </span>
            )}
          </div>
        )}

        {/* Card Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button
            type="button"
            id={`test-provider-btn-${p.id}`}
            data-testid={`test-provider-btn-${p.id}`}
            onClick={() => handleTestConnection(p.id)}
            disabled={testState?.testing}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: testState?.testing ? 'wait' : 'pointer',
            }}
          >
            {testState?.testing ? 'Testing...' : '🧪 Test Connection'}
          </button>
          <button
            type="button"
            id={`save-provider-btn-${p.id}`}
            data-testid={`save-provider-btn-${p.id}`}
            onClick={() => handleSaveProvider(p.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: '#06b6d4',
              border: 'none',
              color: '#000',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    );
  };

  const questionAuthoringProviders = providers
    .filter((p) => !p.scope || p.scope === 'question_authoring')
    .sort((a, b) => (editForms[a.id]?.priority ?? a.priority) - (editForms[b.id]?.priority ?? b.priority));

  const interviewProviders = providers
    .filter((p) => p.scope === 'interview')
    .sort((a, b) => (editForms[a.id]?.priority ?? a.priority) - (editForms[b.id]?.priority ?? b.priority));

  return (
    <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontFamily: 'JetBrains Mono' }}>
            System Settings & Administration
          </h1>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Configure AI model providers, gateway cascade routing, appearance preferences, and exam theme styling
          </div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button
          id="settings-subtab-ai"
          data-testid="settings-subtab-ai"
          onClick={() => setActiveSubtab('AI')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: activeSubtab === 'AI' ? '1px solid #06b6d4' : '1px solid transparent',
            background: activeSubtab === 'AI' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: activeSubtab === 'AI' ? '#06b6d4' : 'var(--text-main)',
            fontWeight: activeSubtab === 'AI' ? 'bold' : 'normal',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✨</span>
          <span>AI & Model Configuration</span>
        </button>

        <button
          id="settings-subtab-appearance"
          data-testid="settings-subtab-appearance"
          onClick={() => setActiveSubtab('APPEARANCE')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: activeSubtab === 'APPEARANCE' ? '1px solid #8b5cf6' : '1px solid transparent',
            background: activeSubtab === 'APPEARANCE' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
            color: activeSubtab === 'APPEARANCE' ? '#8b5cf6' : 'var(--text-main)',
            fontWeight: activeSubtab === 'APPEARANCE' ? 'bold' : 'normal',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🎨</span>
          <span>Appearance & Theme</span>
        </button>

        <button
          id="settings-subtab-exam-themes"
          data-testid="settings-subtab-exam-themes"
          onClick={() => setActiveSubtab('EXAM_THEMES')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: activeSubtab === 'EXAM_THEMES' ? '1px solid #10b981' : '1px solid transparent',
            background: activeSubtab === 'EXAM_THEMES' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            color: activeSubtab === 'EXAM_THEMES' ? '#10b981' : 'var(--text-main)',
            fontWeight: activeSubtab === 'EXAM_THEMES' ? 'bold' : 'normal',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📝</span>
          <span>Exam Paper Themes</span>
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {actionSuccess && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>
          {actionSuccess}
        </div>
      )}

      {/* SUBTAB 1: AI CONFIGURATION */}
      {activeSubtab === 'AI' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Priority Routing Hierarchy Notice */}
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span>⚡</span>
              <span>Scope-Isolated & Priority-Cascaded Gateway Architecture</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              The Gateway routes requests to active providers within their dedicated <strong>isolated scope</strong> in order of <strong>lowest priority number (Priority 1 first)</strong>.
              Token-heavy workloads (such as future oral interviews) run on independent pools, so they never exhaust the quotas required for question authoring.
            </p>
          </div>

          {/* Scope Filter Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              id="scope-filter-all"
              type="button"
              onClick={() => setSelectedScopeFilter('ALL')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: selectedScopeFilter === 'ALL' ? 'bold' : 'normal',
                background: selectedScopeFilter === 'ALL' ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              All Scopes ({providers.length})
            </button>
            <button
              id="scope-filter-question_authoring"
              type="button"
              onClick={() => setSelectedScopeFilter('question_authoring')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: selectedScopeFilter === 'question_authoring' ? 'bold' : 'normal',
                background: selectedScopeFilter === 'question_authoring' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                border: selectedScopeFilter === 'question_authoring' ? '1px solid #06b6d4' : '1px solid var(--border-color)',
                color: selectedScopeFilter === 'question_authoring' ? '#06b6d4' : 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              📚 Question Authoring AI ({questionAuthoringProviders.length})
            </button>
            <button
              id="scope-filter-interview"
              type="button"
              onClick={() => setSelectedScopeFilter('interview')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: selectedScopeFilter === 'interview' ? 'bold' : 'normal',
                background: selectedScopeFilter === 'interview' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                border: selectedScopeFilter === 'interview' ? '1px solid #a855f7' : '1px solid var(--border-color)',
                color: selectedScopeFilter === 'interview' ? '#a855f7' : 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              🎙️ Interview & Grading AI ({interviewProviders.length})
            </button>
          </div>

          {loadingProviders ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading AI providers...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* SECTION 1: QUESTION AUTHORING POOL */}
              {(selectedScopeFilter === 'ALL' || selectedScopeFilter === 'question_authoring') && (
                <div id="scope-section-question_authoring" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>📚</span>
                      <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Question Authoring AI Cascade</h2>
                      <span style={{ fontSize: '11px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', padding: '2px 8px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                        scope: question_authoring
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {questionAuthoringProviders.filter((p) => editForms[p.id]?.isActive).length} active / {questionAuthoringProviders.length} configured
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                    Providers serving single & batch question blueprint synthesis, pedagogical variation authoring, and distractor generation.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
                    {questionAuthoringProviders.map(renderProviderCard)}
                  </div>
                </div>
              )}

              {/* SECTION 2: INTERVIEW & GRADING POOL */}
              {(selectedScopeFilter === 'ALL' || selectedScopeFilter === 'interview') && (
                <div id="scope-section-interview" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: selectedScopeFilter === 'ALL' ? '12px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>🎙️</span>
                      <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Interview & Oral Grading AI Cascade</h2>
                      <span style={{ fontSize: '11px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', padding: '2px 8px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                        scope: interview (Preparatory Isolation)
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {interviewProviders.filter((p) => editForms[p.id]?.isActive).length} active / {interviewProviders.length} configured
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                    Dedicated isolated AI pool for interactive oral examinations, audio viva voce, and Socratic evaluation. Operates on independent quotas, isolated circuit breakers, and separate rate limits.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
                    {interviewProviders.map(renderProviderCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: APPEARANCE & THEMES */}
      {activeSubtab === 'APPEARANCE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>UI Color Scheme</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Choose your interface styling for comfortable question authoring and system administration.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {(
                [
                  { mode: 'LIGHT', label: 'Light Mode', icon: '☀️', desc: 'High contrast clean white theme' },
                  { mode: 'GRAY', label: 'Slate Mode', icon: '🌫️', desc: 'Neutral slate gray palette' },
                  { mode: 'DARK', label: 'Dark Mode', icon: '🌙', desc: 'OLED midnight dark theme' },
                ] as const
              ).map((t) => {
                const isActive = theme === t.mode;
                return (
                  <div
                    key={t.mode}
                    id={`theme-card-${t.mode.toLowerCase()}`}
                    onClick={() => setTheme(t.mode as ThemeMode)}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: isActive ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                      background: isActive ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '20px' }}>{t.icon}</span>
                      {isActive && (
                        <span style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 'bold' }}>Active</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{t.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: EXAM PAPER THEMES (STUB/PLACEHOLDER) */}
      {activeSubtab === 'EXAM_THEMES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '22px' }}>📝</span>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Exam Paper Presentation Themes</h3>
              <span style={{ background: 'rgba(217, 119, 6, 0.15)', color: '#d97706', border: '1px solid #d97706', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                COMING SOON
              </span>
            </div>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Coming soon: preview and select from exam-board-style visual templates for the exam-taking interface.
              Educators will be able to customize typography, question numbering formatting, formula rendering engines, and print/PDF export layouts.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {[
                { name: 'NTA / JEE Standard', desc: 'High-density two-column layout with color-coded status legend' },
                { name: 'CBSE Board Style', desc: 'Serif typography with sectioned headers and rubric point indicators' },
                { name: 'Cambridge / IGCSE', desc: 'Minimalist clean grid with structured sub-part indentations' },
                { name: 'Custom Institutional', desc: 'Branded watermarked theme with custom header logos' },
              ].map((themeItem, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-color)',
                    background: 'rgba(255,255,255,0.01)',
                    opacity: 0.7,
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>{themeItem.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{themeItem.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
