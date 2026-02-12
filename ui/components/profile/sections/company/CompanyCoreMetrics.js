/**
 * CompanyCoreMetrics Section
 * Displays: burn, runway (derived), revenue/traction, headcount, retention, efficiency, growth
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [C2]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';

function MetricCard({ label, value, suffix, warn }) {
  return (
    <div>
      <div className="text-xs text-bb-text-muted uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-semibold ${warn ? 'text-bb-red' : ''}`}>
        {value}{suffix || ''}
      </div>
    </div>
  );
}

function fmtMoney(v) {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
}

export default function CompanyCoreMetrics({ data }) {
  const hasData = data?.burn || data?.cash || data?.employees || data?.revenue || data?.mrr || 
    data?.nrr || data?.grr || data?.nps || data?.acv || data?.paying_customers || data?.payingCustomers;
  
  if (!hasData) {
    return (
      <SectionWrapper label="Core Metrics">
        <EmptyState message="No metrics data available" />
      </SectionWrapper>
    );
  }

  const runway = (data.cash && data.burn && data.burn > 0) 
    ? Math.round(data.cash / data.burn) 
    : null;

  const payingCustomers = data.payingCustomers ?? data.paying_customers;
  const openPositions = data.openPositions ?? data.open_positions;
  const targetHeadcount = data.targetHeadcount ?? data.target_headcount;
  const raisedToDate = data.raisedToDate ?? data.raised_to_date;
  const lastRaiseAmount = data.lastRaiseAmount ?? data.last_raise_amount;
  const logoRetention = data.logoRetention ?? data.logo_retention;
  const grossMargin = data.grossMargin ?? data.gross_margin;

  return (
    <SectionWrapper label="Core Metrics">
      {/* Financial */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {data.burn != null && <MetricCard label="Monthly Burn" value={fmtMoney(data.burn)} />}
        {data.cash != null && <MetricCard label="Cash" value={fmtMoney(data.cash)} />}
        {runway != null && (
          <MetricCard 
            label="Runway (derived)" 
            value={`${runway} mo`} 
            warn={runway < 6}
          />
        )}
        {data.revenue != null && <MetricCard label="ARR" value={fmtMoney(data.revenue)} />}
        {data.mrr != null && <MetricCard label="MRR" value={fmtMoney(data.mrr)} />}
        {raisedToDate != null && <MetricCard label="Raised to Date" value={fmtMoney(raisedToDate)} />}
        {lastRaiseAmount != null && <MetricCard label="Last Raise" value={fmtMoney(lastRaiseAmount)} />}
      </div>

      {/* Retention & Efficiency */}
      {(data.nrr || data.grr || logoRetention || data.nps || grossMargin || data.cac) && (
        <>
          <div className="mt-4 mb-2 text-xs text-bb-text-muted uppercase tracking-wide font-medium">Retention & Efficiency</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {data.nrr != null && <MetricCard label="NRR" value={`${data.nrr}%`} warn={data.nrr < 100} />}
            {data.grr != null && <MetricCard label="GRR" value={`${data.grr}%`} warn={data.grr < 85} />}
            {logoRetention != null && <MetricCard label="Logo Retention" value={`${logoRetention}%`} />}
            {data.nps != null && <MetricCard label="NPS" value={data.nps} warn={data.nps < 30} />}
            {grossMargin != null && <MetricCard label="Gross Margin" value={`${grossMargin}%`} />}
            {data.cac != null && <MetricCard label="CAC" value={fmtMoney(data.cac)} />}
            {data.acv != null && <MetricCard label="ACV" value={fmtMoney(data.acv)} />}
          </div>
        </>
      )}

      {/* Team */}
      {(data.employees || payingCustomers || openPositions) && (
        <>
          <div className="mt-4 mb-2 text-xs text-bb-text-muted uppercase tracking-wide font-medium">Team & Growth</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {data.employees != null && (
              <MetricCard 
                label={targetHeadcount ? `Headcount (target ${targetHeadcount})` : 'Headcount'} 
                value={data.employees} 
              />
            )}
            {openPositions != null && <MetricCard label="Open Positions" value={openPositions} />}
            {payingCustomers != null && <MetricCard label="Paying Customers" value={payingCustomers.toLocaleString()} />}
            {data.founded && <MetricCard label="Founded" value={data.founded.slice(0, 4)} />}
          </div>
        </>
      )}
    </SectionWrapper>
  );
}
