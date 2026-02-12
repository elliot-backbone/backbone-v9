import { useState, useEffect, useCallback, useRef } from 'react';
import ActionDetailModal from '../components/ActionDetailModal';
import CompanyCard from '../components/CompanyCard';
import { AppLayout } from '../components/nav';
import { groupActionsByCompanyCategory } from '../lib/actionCategories';

/**
 * Homepage - Portfolio Command Board
 *
 * Grid of company trading cards. Each card shows snapshot metrics
 * and one action per category. Actions sorted by rankScore from API.
 */

export default function Home() {
  const [actions, setActions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);

  const completedThisSession = useRef(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [actionsRes, companiesRes] = await Promise.all([
        fetch('/api/actions/today'),
        fetch('/api/companies'),
      ]);

      if (!actionsRes.ok) throw new Error('Failed to fetch actions');
      if (!companiesRes.ok) throw new Error('Failed to fetch companies');

      const actionsData = await actionsRes.json();
      const companiesData = await companiesRes.json();

      const available = (actionsData.actions || []).filter(
        a => !completedThisSession.current.has(a.actionId)
      );

      setActions(available);
      setCompanies(companiesData.companies || []);
    } catch (err) {
      setError(err.message);
      setActions([]);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Action handlers (same API calls as before)
  const handleActionDone = useCallback(async (action) => {
    try {
      await fetch('/api/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: action.actionId,
          entityId: action.entityRef?.id,
          executedAt: new Date().toISOString(),
        }),
      });
      await fetch('/api/actions/observe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: action.actionId,
          entityId: action.entityRef?.id,
          actionType: action.resolutionId || null,
          notes: 'Completed via command board',
          observedAt: new Date().toISOString(),
        }),
      });
      completedThisSession.current.add(action.actionId);
      setActions(prev => prev.filter(a => a.actionId !== action.actionId));
    } catch (err) {
      console.error('Done error:', err);
    }
  }, []);

  const handleActionSkip = useCallback(async (action) => {
    try {
      await fetch('/api/actions/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: action.actionId,
          entityId: action.entityRef?.id,
          reason: 'Skipped via command board',
          skippedAt: new Date().toISOString(),
        }),
      });
      completedThisSession.current.add(action.actionId);
      setActions(prev => prev.filter(a => a.actionId !== action.actionId));
    } catch (err) {
      console.error('Skip error:', err);
    }
  }, []);

  // Modal handlers for detail view
  const handleExecute = useCallback(async (executedAt) => {
    if (!selectedAction) return;
    try {
      await fetch('/api/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: selectedAction.actionId,
          entityId: selectedAction.entityRef?.id,
          executedAt,
        }),
      });
    } catch (err) {
      console.error('Execute error:', err);
    }
  }, [selectedAction]);

  const handleObserve = useCallback(async (notes) => {
    if (!selectedAction) return;
    try {
      await fetch('/api/actions/observe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: selectedAction.actionId,
          entityId: selectedAction.entityRef?.id,
          actionType: selectedAction.resolutionId || null,
          notes,
          observedAt: new Date().toISOString(),
        }),
      });
      completedThisSession.current.add(selectedAction.actionId);
      setActions(prev => prev.filter(a => a.actionId !== selectedAction.actionId));
      setSelectedAction(null);
    } catch (err) {
      console.error('Observe error:', err);
    }
  }, [selectedAction]);

  const handleModalSkip = useCallback(async (reason) => {
    if (!selectedAction) return;
    try {
      await fetch('/api/actions/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: selectedAction.actionId,
          entityId: selectedAction.entityRef?.id,
          reason,
          skippedAt: new Date().toISOString(),
        }),
      });
      completedThisSession.current.add(selectedAction.actionId);
      setActions(prev => prev.filter(a => a.actionId !== selectedAction.actionId));
      setSelectedAction(null);
    } catch (err) {
      console.error('Skip error:', err);
    }
  }, [selectedAction]);

  // Group actions by company → category
  const actionsByCompany = groupActionsByCompanyCategory(actions);

  // Sort companies by aggregate impact (sum of top action rankScores)
  const sortedCompanies = [...companies].sort((a, b) => {
    const aActions = actionsByCompany[a.id] || {};
    const bActions = actionsByCompany[b.id] || {};
    const aScore = Object.values(aActions).reduce((sum, acts) => sum + (acts[0]?.rankScore || 0), 0);
    const bScore = Object.values(bActions).reduce((sum, acts) => sum + (acts[0]?.rankScore || 0), 0);
    return bScore - aScore;
  });

  return (
    <AppLayout onRefresh={fetchData}>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-display text-bb-text">Portfolio Command Board</h1>
            {!loading && (
              <p className="text-bb-text-muted text-xs font-mono mt-1">
                {companies.length} companies &middot; {actions.length} actions
              </p>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-bb-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-bb-panel border border-bb-red p-4 text-bb-red font-mono text-sm">
              {error}
            </div>
          )}

          {/* Company Card Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedCompanies.map((company, index) => (
                <div
                  key={company.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <CompanyCard
                    company={company}
                    categoryActions={actionsByCompany[company.id] || {}}
                    onActionClick={setSelectedAction}
                    onDone={handleActionDone}
                    onSkip={handleActionSkip}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedAction && (
        <ActionDetailModal
          action={selectedAction}
          onClose={() => setSelectedAction(null)}
          onExecute={handleExecute}
          onObserve={handleObserve}
          onSkip={handleModalSkip}
        />
      )}
    </AppLayout>
  );
}
