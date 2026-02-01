/**
 * DealSummary Section
 * Displays deal overview: investor, amount, status
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0: Section [D1]
 */
import SectionWrapper from '../shared/SectionWrapper';
import EmptyState from '../shared/EmptyState';
import EntityLink from '../../../links/EntityLink';

export default function DealSummary({ data }) {
  if (!data) {
    return (
      <SectionWrapper label="Deal Summary">
        <EmptyState message="No deal data available" />
      </SectionWrapper>
    );
  }

  const { investor, investorId, amount, status, probability, asOf } = data;

  return (
    <SectionWrapper label="Deal Summary">
      <div className="space-y-3">
        <div className="text-sm">
          <span className="text-gray-500">Investor:</span>{' '}
          {investorId ? (
            <EntityLink type="firm" id={investorId} className="font-medium text-blue-600 hover:underline">
              {investor}
            </EntityLink>
          ) : (
            <span className="font-medium">{investor}</span>
          )}
        </div>
        
        {amount && (
          <div className="text-sm">
            <span className="text-gray-500">Amount:</span>{' '}
            <span className="font-medium">${(amount / 1000000).toFixed(1)}M</span>
          </div>
        )}
        
        {status && (
          <div className="text-sm">
            <span className="text-gray-500">Status:</span>{' '}
            <span className={`inline-block px-2 py-0.5 text-xs rounded font-medium ${
              status === 'termsheet' ? 'bg-green-100 text-green-700' :
              status === 'dd' ? 'bg-blue-100 text-blue-700' :
              status === 'meeting' ? 'bg-amber-100 text-amber-700' :
              status === 'closed' ? 'bg-purple-100 text-purple-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {status === 'dd' ? 'Due Diligence' : status}
            </span>
          </div>
        )}
        
        {probability !== undefined && (
          <div className="text-sm">
            <span className="text-gray-500">Probability:</span>{' '}
            <span className={`font-medium ${probability >= 70 ? 'text-green-600' : probability >= 40 ? 'text-amber-600' : 'text-gray-600'}`}>
              {probability}%
            </span>
          </div>
        )}
        
        {asOf && (
          <div className="text-xs text-gray-400 mt-2">
            As of {new Date(asOf).toLocaleDateString()}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
