/**
 * Section Wrapper Component
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Consistent section headers across all entities
 * - Typography-first layout
 * - No tabs, no hidden content by default
 */

/**
 * @param {Object} props
 * @param {string} props.title - Section title (legacy)
 * @param {string} props.label - Section label (preferred)
 * @param {React.ReactNode} props.children - Section content
 */
export default function SectionWrapper({ title, label, children }) {
  const heading = label || title;
  return (
    <section className="py-4">
      <h2 className="text-sm font-medium text-gray-500 mb-3">{heading}</h2>
      <div>{children}</div>
    </section>
  );
}
