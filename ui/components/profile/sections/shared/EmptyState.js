/**
 * Empty State Component
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Missing data never removes sections; it renders explicit empty state
 * - No "TODO" or "Coming soon" placeholders
 * - "Not available" is allowed; invented content is not
 */

/**
 * @param {Object} props
 * @param {string} [props.message] - Custom message (defaults to "Not available")
 */
export default function EmptyState({ message = 'Not available' }) {
  return (
    <div className="py-2 text-sm text-bb-text-muted font-mono">
      {message}
    </div>
  );
}
