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
 * @param {string} props.title - Section title
 * @param {React.ReactNode} props.children - Section content
 */
export default function SectionWrapper({ title, children }) {
  return (
    <section className="py-4">
      <h2 className="text-sm font-medium text-gray-500 mb-3">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
