import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  PlanDTO,
  SubscriptionDTO,
  InvoiceDTO,
  AICreditPackageDTO,
  RefundTransactionDTO,
  UserAICreditsDTO,
} from '@repo/types';

export const SubscriptionPage: React.FC = () => {
  const { token, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'plans' | 'credits' | 'invoices' | 'admin_refunds'>('plans');
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionDTO | null>(null);
  const [credits, setCredits] = useState<UserAICreditsDTO | null>(null);
  const [packages, setPackages] = useState<AICreditPackageDTO[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const [transactions, setTransactions] = useState<RefundTransactionDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Checkout modal
  const [checkoutItem, setCheckoutItem] = useState<{
    type: 'SUBSCRIPTION' | 'CREDIT_PACKAGE';
    id: string;
    name: string;
    price: number;
    billingCycle?: 'monthly' | 'annual';
  } | null>(null);

  // Refund modal (Admin)
  const [showRefundModal, setShowRefundModal] = useState<boolean>(false);
  const [refundForm, setRefundForm] = useState({
    gatewayPaymentId: '',
    subscriptionId: '',
    amount: '',
    reason: 'Customer requested refund after accidental upgrade',
    clawbackCredits: true,
  });

  const canManageBilling =
    user?.permissions?.includes('billing.manage') ||
    user?.permissions?.includes('*') ||
    user?.roles?.includes('MAIN_ADMIN') ||
    user?.roles?.includes('SUB_ADMIN');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [plansRes, subRes, credRes, pkgRes, invRes] = await Promise.all([
        fetch('http://localhost:4043/api/v1/subscriptions/plans', { headers }).then((r) => r.json()),
        fetch('http://localhost:4043/api/v1/subscriptions/me', { headers }).then((r) => r.json()),
        fetch('http://localhost:4043/api/v1/ai-credits/balance', { headers }).then((r) => r.json()),
        fetch('http://localhost:4043/api/v1/ai-credits/packages', { headers }).then((r) => r.json()),
        fetch('http://localhost:4043/api/v1/billing/invoices', { headers }).then((r) => r.json()),
      ]);

      if (plansRes.success) setPlans(plansRes.data);
      if (subRes.success) setSubscription(subRes.data);
      if (credRes.success) setCredits(credRes.data);
      if (pkgRes.success) setPackages(pkgRes.data);
      if (invRes.success) setInvoices(invRes.data);

      if (canManageBilling) {
        const txRes = await fetch('http://localhost:4043/api/v1/billing/transactions', { headers }).then((r) =>
          r.json()
        );
        if (txRes.success) setTransactions(txRes.data);
      }
    } catch (e: any) {
      showToast('Error loading subscription details: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, canManageBilling]);

  const handleCheckoutConfirm = async () => {
    if (!checkoutItem || !token) return;
    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:4043/api/v1/billing/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemType: checkoutItem.type,
          itemId: checkoutItem.id,
          billingCycle: checkoutItem.billingCycle || 'monthly',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Checkout failed');
      }
      showToast(`Successfully processed payment for ${checkoutItem.name}!`);
      setCheckoutItem(null);
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'Transaction failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!token || !confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing cycle.'))
      return;
    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:4043/api/v1/subscriptions/cancel', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Subscription cancelled successfully.');
      await fetchData();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:4043/api/v1/billing/refunds', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gatewayPaymentId: refundForm.gatewayPaymentId || undefined,
          subscriptionId: refundForm.subscriptionId || undefined,
          amount: parseFloat(refundForm.amount),
          reason: refundForm.reason,
          clawbackCredits: refundForm.clawbackCredits,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Refund failed');
      showToast(`Refund processed successfully! Refund ID: ${data.data.gatewayRefundId}`);
      setShowRefundModal(false);
      setRefundForm({
        gatewayPaymentId: '',
        subscriptionId: '',
        amount: '',
        reason: 'Customer requested refund after accidental upgrade',
        clawbackCredits: true,
      });
      await fetchData();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const currentPlanCode = subscription?.planCode || 'FREE';

  return (
    <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '12px 20px',
            background: 'var(--panel-bg)',
            border: '1px solid #06b6d4',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            color: '#06b6d4',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header & Status Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Subscriptions & Entitlements</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Manage your student tier, daily AI quotas, test limits, and purchase credit packs.
          </p>
        </div>

        {/* Current Plan Badge Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '12px 20px',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CURRENT PLAN
            </div>
            <div
              id="badge-active-plan"
              data-testid="badge-active-plan"
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: currentPlanCode === 'FREE' ? 'var(--text-main)' : '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{currentPlanCode}</span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                }}
              >
                {subscription?.status || 'ACTIVE'}
              </span>
            </div>
          </div>

          <div style={{ width: '1px', height: '28px', background: 'var(--border-color)' }} />

          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              AI CREDITS BALANCE
            </div>
            <div
              id="widget-credits-balance"
              data-testid="widget-credits-balance"
              style={{ fontSize: '16px', fontWeight: 700, color: '#06b6d4' }}
            >
              {credits?.totalAvailableCredits || 0}{' '}
              <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>
                ({credits?.remainingDailyCredits || 0} daily + {credits?.purchasedCredits || 0} pack)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '24px',
        }}
      >
        {[
          { key: 'plans', label: 'Subscription Plans', id: 'tab-plans' },
          { key: 'credits', label: 'AI Credit Packs', id: 'tab-credits' },
          { key: 'invoices', label: 'Invoices & Receipts', id: 'tab-invoices' },
          ...(canManageBilling
            ? [{ key: 'admin_refunds', label: 'Admin Financial & Refunds', id: 'tab-admin-refunds' }]
            : []),
        ].map((tab) => (
          <button
            key={tab.key}
            id={tab.id}
            data-testid={tab.id}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #06b6d4' : '2px solid transparent',
              color: activeTab === tab.key ? '#06b6d4' : 'var(--text-muted)',
              fontWeight: activeTab === tab.key ? 600 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Loading subscription tiers and account balance...
        </div>
      ) : (
        <>
          {/* TAB 1: Subscription Plans Grid */}
          {activeTab === 'plans' && (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px',
                  marginBottom: '24px',
                }}
              >
                {plans.map((plan) => {
                  const isCurrent = currentPlanCode === plan.code;
                  return (
                    <div
                      key={plan.id}
                      id={`card-plan-${plan.code.toLowerCase()}`}
                      data-testid={`card-plan-${plan.code.toLowerCase()}`}
                      style={{
                        background: 'var(--panel-bg)',
                        border: isCurrent ? '2px solid #10b981' : '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative',
                      }}
                    >
                      {isCurrent && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '16px',
                            background: '#10b981',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            textTransform: 'uppercase',
                          }}
                        >
                          Active Tier
                        </div>
                      )}

                      <div>
                        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700 }}>{plan.name}</h3>
                        <p style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: '12px', minHeight: '36px' }}>
                          {plan.description}
                        </p>

                        <div style={{ marginBottom: '20px' }}>
                          <span style={{ fontSize: '28px', fontWeight: 800 }}>${plan.price.toFixed(2)}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}> /{plan.billingCycle}</span>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginBottom: '20px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
                            Included Entitlements
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.8' }}>
                            {plan.features.map((feat, idx) => (
                              <li key={idx}>{feat}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div>
                        {isCurrent ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                              disabled
                              style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '6px',
                                border: '1px solid #10b981',
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                fontWeight: 600,
                                cursor: 'default',
                              }}
                            >
                              ✓ Current Plan
                            </button>
                            {plan.code !== 'FREE' && (
                              <button
                                id="btn-cancel-subscription"
                                data-testid="btn-cancel-subscription"
                                onClick={handleCancelSubscription}
                                disabled={actionLoading}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'none',
                                  color: '#ef4444',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel Auto-Renewal
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            id={`btn-upgrade-${plan.code.toLowerCase()}`}
                            data-testid={`btn-upgrade-${plan.code.toLowerCase()}`}
                            onClick={() =>
                              setCheckoutItem({
                                type: 'SUBSCRIPTION',
                                id: plan.code,
                                name: plan.name,
                                price: plan.price,
                                billingCycle: plan.billingCycle,
                              })
                            }
                            style={{
                              width: '100%',
                              padding: '10px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#06b6d4',
                              color: '#fff',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'opacity 0.2s',
                            }}
                          >
                            Upgrade to {plan.name}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: AI Credit Packs */}
          {activeTab === 'credits' && (
            <div>
              <div
                style={{
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px',
                }}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>AI Credits Quota Policy</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5' }}>
                  Daily included credits ({credits?.includedDailyCredits || 5}/day) are consumed first and reset automatically at 00:00 UTC. Purchased pack credits never expire and are consumed seamlessly when daily allowances are exhausted.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '20px',
                }}
              >
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    id={`card-pkg-${pkg.id}`}
                    data-testid={`card-pkg-${pkg.id}`}
                    style={{
                      background: 'var(--panel-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '20px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#06b6d4', marginBottom: '4px' }}>
                      +{pkg.creditsCount} Credits
                    </div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>{pkg.name}</h4>
                    <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px' }}>
                      ${pkg.price.toFixed(2)}
                    </div>
                    <button
                      id={`btn-buy-pkg-${pkg.id}`}
                      data-testid={`btn-buy-pkg-${pkg.id}`}
                      onClick={() =>
                        setCheckoutItem({
                          type: 'CREDIT_PACKAGE',
                          id: pkg.id,
                          name: pkg.name,
                          price: pkg.price,
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#06b6d4',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Buy Pack (${pkg.price})
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Invoices & Receipts */}
          {activeTab === 'invoices' && (
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Payment Invoices & Receipts</h3>
              {invoices.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
                  No payment invoices on record.
                </div>
              ) : (
                <table id="table-user-invoices" data-testid="table-user-invoices" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>INVOICE ID</th>
                      <th style={{ padding: '10px' }}>DATE</th>
                      <th style={{ padding: '10px' }}>AMOUNT</th>
                      <th style={{ padding: '10px' }}>STATUS</th>
                      <th style={{ padding: '10px' }}>EXTERNAL TX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px', fontFamily: 'monospace' }}>{inv.id}</td>
                        <td style={{ padding: '10px' }}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '10px', fontWeight: 600 }}>${inv.amount.toFixed(2)}</td>
                        <td style={{ padding: '10px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: inv.status === 'PAID' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: inv.status === 'PAID' ? '#10b981' : '#ef4444',
                            }}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          {inv.externalId || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 4: Admin Financial Audit & Refund Engine */}
          {activeTab === 'admin_refunds' && canManageBilling && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Financial Transactions & Refunds</h3>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                    Issue full or partial refunds with automated unspent credit clawback and plan downgrades.
                  </p>
                </div>
                <button
                  id="btn-open-refund-modal"
                  data-testid="btn-open-refund-modal"
                  onClick={() => setShowRefundModal(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#ef4444',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  + Process Refund
                </button>
              </div>

              <div
                style={{
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                {transactions.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
                    No refund transactions processed yet.
                  </div>
                ) : (
                  <table id="table-admin-transactions" data-testid="table-admin-transactions" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>REFUND ID</th>
                        <th style={{ padding: '10px' }}>GATEWAY REFUND</th>
                        <th style={{ padding: '10px' }}>AMOUNT</th>
                        <th style={{ padding: '10px' }}>CLAWBACK</th>
                        <th style={{ padding: '10px' }}>REASON</th>
                        <th style={{ padding: '10px' }}>DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px', fontFamily: 'monospace' }}>{tx.id}</td>
                          <td style={{ padding: '10px', fontFamily: 'monospace', color: '#06b6d4' }}>
                            {tx.gatewayRefundId}
                          </td>
                          <td style={{ padding: '10px', fontWeight: 600, color: '#ef4444' }}>
                            -${tx.refundAmount.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px' }}>
                            {tx.clawbackCreditsCount > 0 ? `-${tx.clawbackCreditsCount} credits` : 'Subscription downgraded'}
                          </td>
                          <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{tx.reason}</td>
                          <td style={{ padding: '10px' }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Checkout Modal */}
      {checkoutItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setCheckoutItem(null)}
        >
          <div
            id="modal-checkout"
            data-testid="modal-checkout"
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '24px',
              width: '440px',
              maxWidth: '90vw',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Confirm Order & Payment</h3>
            <p style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              Item: <strong>{checkoutItem.name}</strong>
            </p>

            <div
              style={{
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '20px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>AI Model Cost Quota:</span>
                <span>${(checkoutItem.price * 0.4).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Compute & Cloud Infrastructure:</span>
                <span>${(checkoutItem.price * 0.3).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Platform Maintenance & Support:</span>
                <span>${(checkoutItem.price * 0.3).toFixed(2)}</span>
              </div>
              <div
                style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                <span>Total Amount:</span>
                <span style={{ color: '#10b981' }}>${checkoutItem.price.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setCheckoutItem(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                id="btn-confirm-checkout"
                data-testid="btn-confirm-checkout"
                onClick={handleCheckoutConfirm}
                disabled={actionLoading}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#06b6d4',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {actionLoading ? 'Processing...' : 'Pay & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Refund Modal */}
      {showRefundModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowRefundModal(false)}
        >
          <div
            id="modal-refund"
            data-testid="modal-refund"
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '24px',
              width: '460px',
              maxWidth: '90vw',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#ef4444' }}>Process Financial Refund</h3>
            <p style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              Initiate a gateway refund ("return money") with automated unspent credit clawback.
            </p>

            <form onSubmit={handleProcessRefund}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Gateway Payment Transaction ID (e.g. tx_mock_...)
                </label>
                <input
                  id="refund-payment-id-input"
                  data-testid="refund-payment-id-input"
                  type="text"
                  value={refundForm.gatewayPaymentId}
                  onChange={(e) => setRefundForm({ ...refundForm, gatewayPaymentId: e.target.value })}
                  placeholder="tx_mock_..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Refund Amount ($ USD)
                </label>
                <input
                  id="refund-amount-input"
                  data-testid="refund-amount-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                  placeholder="29.99"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Reason for Refund
                </label>
                <textarea
                  id="refund-reason-input"
                  data-testid="refund-reason-input"
                  rows={2}
                  required
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="clawback-credits-checkbox"
                  data-testid="clawback-credits-checkbox"
                  checked={refundForm.clawbackCredits}
                  onChange={(e) => setRefundForm({ ...refundForm, clawbackCredits: e.target.checked })}
                />
                <label htmlFor="clawback-credits-checkbox" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Clawback unspent purchased credits & downgrade subscription
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-refund"
                  data-testid="btn-submit-refund"
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#ef4444',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Issue Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
