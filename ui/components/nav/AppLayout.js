/**
 * AppLayout - Main layout wrapper
 * 
 * Provides consistent navigation across all pages:
 * - VerticalNav (burger sidebar)
 * - HorizontalNav (top bar)
 * - Content area with proper padding
 */

import VerticalNav from './VerticalNav';
import HorizontalNav from './HorizontalNav';

export default function AppLayout({ children, onRefresh }) {
  return (
    <div className="min-h-screen bg-bb-dark">
      {/* Navigation */}
      <VerticalNav />
      <HorizontalNav onRefresh={onRefresh} />
      
      {/* Main Content - offset for nav */}
      <main className="ml-12 pt-12">
        {children}
      </main>
    </div>
  );
}
