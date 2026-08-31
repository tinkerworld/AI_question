import React, { useState, useEffect } from 'react';
import { getAuthHeaders } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode } from '@repo/types';
import { API_BASE } from '../config/api';

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
  type ScopeFilterType =
    | 'ALL'
    | 'question_generation'
    | 'question_paraphrase'
    | 'interview_conversation'
    | 'interview_grading'
    | 'writing_analysis'
    | 'question_authoring'
    | 'interview';

  const [selectedScopeFilter, setSelectedScopeFilter] = useState<ScopeFilterType>('ALL');

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

        {/* Configuration Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
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
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Base API URL
            </label>
            <input
              type="text"
              id={`baseurl-provider-${p.id}`}
              data-testid={`baseurl-provider-${p.id}`}
              value={form.baseUrl}
              onChange={(e) => handleFieldChange(p.id, 'baseUrl', e.target.value)}
              placeholder="e.g. https://api.groq.com/openai/v1"
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Priority (1 = Highest)
            </label>
            <input
              type="number"
              min={1}
              max={999}
              id={`priority-provider-${p.id}`}
              data-testid={`priority-provider-${p.id}`}
              value={form.priority}
              onChange={(e) => handleFieldChange(p.id, 'priority', parseInt(e.target.value) || 1)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
              }}
            />
          </div>

          {p.type === 'CLOUD' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  API Key (Encrypted at Rest)
                </label>
                <button
                  type="button"
                  onClick={() => handleFieldChange(p.id, 'showKey', !form.showKey)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#06b6d4',
                    fontSize: '10px',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {form.showKey ? 'Hide' : 'Reveal'}
                </button>
              </div>
              <input
                type={form.showKey ? 'text' : 'password'}
                id={`apikey-provider-${p.id}`}
                data-testid={`apikey-provider-${p.id}`}
                value={form.apiKey}
                onChange={(e) => handleFieldChange(p.id, 'apiKey', e.target.value)}
                placeholder="Paste API Key here..."
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                }}
              />
            </div>
          )}
        </div>

        {/* Live Test Status Feedback */}
        {testState && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              background: testState.testing
                ? 'rgba(6, 182, 212, 0.1)'
                : testState.success
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
              border: testState.testing
                ? '1px solid #06b6d4'
                : testState.success
                ? '1px solid #10b981'
                : '1px solid #ef4444',
              color: testState.testing
                ? '#06b6d4'
                : testState.success
                ? '#10b981'
                : '#ef4444',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              {testState.testing
                ? 'Testing live connection...'
                : testState.success
                ? `✓ Connection operational! ${testState.message || ''}`
                : `✗ Connection failed: ${testState.message || ''}`}
            </span>
            {testState.latencyMs !== undefined && (
              <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 'bold' }}>
                Latency: {testState.latencyMs}ms
              </span>
            )}
          </div>
        )}

        {/* Card Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '2px' }}>
          <button
            type="button"
            id={`test-provider-btn-${p.id}`}
            data-testid={`test-provider-btn-${p.id}`}
            disabled={testState?.testing}
            onClick={() => handleTestConnection(p.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-main)',
              fontSize: '12px',
              cursor: testState?.testing ? 'not-allowed' : 'pointer',
              opacity: testState?.testing ? 0.6 : 1,
            }}
          >
            {testState?.testing ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            type="button"
            id={`save-provider-btn-${p.id}`}
            data-testid={`save-provider-btn-${p.id}`}
            onClick={() => handleSaveProvider(p.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
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

  const getProvidersForScope = (scopeName: string) =>
    providers
      .filter((p) => p.scope === scopeName)
      .sort((a, b) => (editForms[a.id]?.priority ?? a.priority) - (editForms[b.id]?.priority ?? b.priority));

  const qgenProviders = getProvidersForScope('question_generation');
  const qparaProviders = getProvidersForScope('question_paraphrase');
  const ivconvProviders = getProvidersForScope('interview_conversation');
  const ivgradeProviders = getProvidersForScope('interview_grading');
  const writingProviders = getProvidersForScope('writing_analysis');
  const legacyQaProviders = getProvidersForScope('question_authoring');
  const legacyIvProviders = getProvidersForScope('interview');

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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
              id="scope-filter-question_generation"
              type="button"
              onClick={() => setSelectedScopeFilter('question_generation')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: selectedScopeFilter === 'question_generation' ? 'bold' : 'normal',
                background: selectedScopeFilter === 'question_generation' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                border: selectedScopeFilter === 'question_generation' ? '1px solid #06b6d4' : '1px solid var(--border-color)',
                color: selectedScopeFilter === 'question_generation' ? '#06b6d4' : 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              📝 Question Generation ({qgenProviders.length})
            </button>
            <button
              id="scope-filter-question_paraphrase"
              type="button"
              onClick={() => setSelectedScopeFilter('question_paraphrase')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: selectedScopeFilter === 'question_paraphrase' ? 'bold' : 'normal',
                background: selectedScopeFilter === 'question_paraphrase' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                border: selectedScopeFilter === 'question_paraphrase' ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                color: selectedScopeFilter === 'question_paraphrase' ? '#3b82f6' : 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              🔄 Question Paraphrase & Modify ({qparaProviders.length})
            </button>
            <button
              id="scope-filter-interview_conversation"
              type="button"
              onClick={() => setSelectedScopeFilter('interview_conversation')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: selectedScopeFilter === 'interview_conversation' ? 'bold' : 'normal',
                background: selectedScopeFilter === 'interview_conversation' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                border: selectedScopeFilter === 'interview_conversation' ? '1px solid #a855f7' : '1px solid var(--border-color)',
                color: selectedScopeFilter === 'interview_conversation' ? '#a855f7' : 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              🎙️ Live Interview Dialogue ({ivconvProviders.length})
            </button>
            <button
              id="scope-filter-interview_grading"
              type="button"
              onClick={() => setSelectedScopeFilter('interview_grading')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: selectedScopeFilter === 'interview_grading' ? 'bold' : 'normal',
                background: selectedScopeFilter === 'interview_grading' ? 'rgba(236, 72, 153, 0.15)' : 'transparent',
                border: selectedScopeFilter === 'interview_grading' ? '1px solid #ec4899' : '1px solid var(--border-color)',
                color: selectedScopeFilter === 'interview_grading' ? '#ec4899' : 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              ⚖️ Interview Rubric Evaluation ({ivgradeProviders.length})
            </button>
            <button
              id="scope-filter-writing_analysis"
              type="button"
              onClick={() => setSelectedScopeFilter('writing_analysis')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: selectedScopeFilter === 'writing_analysis' ? 'bold' : 'normal',
                background: selectedScopeFilter === 'writing_analysis' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                border: selectedScopeFilter === 'writing_analysis' ? '1px solid #10b981' : '1px solid var(--border-color)',
                color: selectedScopeFilter === 'writing_analysis' ? '#10b981' : 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              ✍️ Writing & Essay Analysis ({writingProviders.length})
            </button>
            {/* Legacy compatibility filter buttons */}
            <button
              id="scope-filter-question_authoring"
              type="button"
              onClick={() => setSelectedScopeFilter('question_authoring')}
              style={{ display: 'none' }}
            >
              Question Authoring
            </button>
            <button
              id="scope-filter-interview"
              type="button"
              onClick={() => setSelectedScopeFilter('interview')}
              style={{ display: 'none' }}
            >
              Interview Scope
            </button>
          </div>

          {loadingProviders ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading AI providers...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* SECTION 1: QUESTION GENERATION */}
              {(selectedScopeFilter === 'ALL' || selectedScopeFilter === 'question_generation' || selectedScopeFilter === 'question_authoring') && qgenProviders.length > 0 && (
                <div id="scope-section-question_generation" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>📝</span>
                      <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Question Generation AI Cascade</h2>
                      <span style={{ fontSize: '11px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', padding: '2px 8px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                        scope: question_generation
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {qgenProviders.filter((p) => editForms[p.id]?.isActive).length} active / {qgenProviders.length} configured
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                    Deep subject synthesis models creating high-rigor questions, multi-distractor choices, and comprehensive step-by-step explanations from syllabus blueprints.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
                    {qgenProviders.map(renderProviderCard)}
                  </div>
                </div>
              )}

              {/* SECTION 2: QUESTION PARAPHRASE */}
              {(selectedScopeFilter === 'ALL' || selectedScopeFilter === 'question_paraphrase' || selectedScopeFilter === 'question_authoring') && qparaProviders.length > 0 && (
                <div id="scope-section-question_paraphrase" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>🔄</span>
                      <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Question Paraphrase & Modify AI Cascade</h2>
                      <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '2px 8px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                        scope: question_paraphrase
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {qparaProviders.filter((p) => editForms[p.id]?.isActive).length} active / {qparaProviders.length} configured
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                    High-speed models optimized for creating pedagogical variations, adjusting numeric constants, and rephrasing question stems while preserving core answer validity.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
                    {qparaProviders.map(renderProviderCard)}
                  </div>
                </div>
              )}

              {/* SECTION 3: INTERVIEW CONVERSATION */}
              {(selectedScopeFilter === 'ALL' || selectedScopeFilter === 'interview_conversation' || selectedScopeFilter === 'interview') && ivconvProviders.length > 0 && (
                <div id="scope-section-interview_conversation" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>🎙️</span>
                      <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Live Interview Dialogue AI Cascade</h2>
                      <span style={{ fontSize: '11px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', padding: '2px 8px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                        scope: interview_conversation
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {ivconvProviders.filter((p) => editForms[p.id]?.isActive).length} active / {ivconvProviders.length} configured
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                    Ultra-low-latency conversational models conducting real-time oral exams, follow-up probing questions, and audio viva voce sessions.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
                    {ivconvProviders.map(renderProviderCard)}
                  </div>
                </div>
              )}

              {/* SECTION 4: INTERVIEW GRADING */}
              {(selectedScopeFilter === 'ALL' || selectedScopeFilter === 'interview_grading' || selectedScopeFilter === 'interview') && ivgradeProviders.length > 0 && (
                <div id="scope-section-interview_grading" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>⚖️</span>
                      <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Interview Rubric Evaluation AI Cascade</h2>
                      <span style={{ fontSize: '11px', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', padding: '2px 8px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                        scope: interview_grading
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {ivgradeProviders.filter((p) => editForms[p.id]?.isActive).length} active / {ivgradeProviders.length} configured
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                    High-reasoning evaluators performing deep post-interview rubric scoring (IELTS 4-criterion band mapping, strengths, weaknesses, and concrete recommendations).
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
                    {ivgradeProviders.map(renderProviderCard)}
                  </div>
                </div>
              )}

              {/* SECTION 5: WRITING & ESSAY ANALYSIS */}
              {(selectedScopeFilter === 'ALL' || selectedScopeFilter === 'writing_analysis') && writingProviders.length > 0 && (
                <div id="scope-section-writing_analysis" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>✍️</span>
                      <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Writing & Essay Analysis AI Cascade</h2>
                      <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                        scope: writing_analysis
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {writingProviders.filter((p) => editForms[p.id]?.isActive).length} active / {writingProviders.length} configured
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                    Evaluation models scoring long-form essay responses across Task Achievement, Coherence & Cohesion, Lexical Resource, and Grammatical Range.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
                    {writingProviders.map(renderProviderCard)}
                  </div>
                </div>
              )}

              {/* SECTION 6: LEGACY FALLBACK PROVIDERS (IF ANY) */}
              {selectedScopeFilter === 'ALL' && (legacyQaProviders.length > 0 || legacyIvProviders.length > 0) && (
                <div id="scope-section-legacy" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>🛡️</span>
                      <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Fallback & Legacy AI Providers</h2>
                      <span style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                        legacy aliases
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
                    {[...legacyQaProviders, ...legacyIvProviders].map(renderProviderCard)}
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
