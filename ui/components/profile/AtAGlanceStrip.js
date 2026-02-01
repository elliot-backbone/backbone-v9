/**
 * At-a-Glance Strip Component [B]
 * 
 * BB-UI-PROFILES-CONTRACT-v1.0 compliance:
 * - Maximum 5 tiles
 * - Tiles derived at runtime
 * - Consistent style across entities
 * - Hard exclusion: if a tile does not change a plausible decision, it does not belong
 * - No pseudo-precision
 */

import AtAGlanceTile from './AtAGlanceTile';

/**
 * @param {Object} props
 * @param {Array<{ label: string, value: string, state?: string, linkedEntity?: object }>} props.tiles
 */
export default function AtAGlanceStrip({ tiles = [] }) {
  // Contract: maximum 5 tiles
  const displayTiles = tiles.slice(0, 5);
  
  if (displayTiles.length === 0) {
    return (
      <section className="mb-8">
        <div className="text-sm text-gray-400">No signals available</div>
      </section>
    );
  }
  
  return (
    <section className="mb-8">
      <div className="flex flex-wrap gap-3">
        {displayTiles.map((tile, index) => (
          <AtAGlanceTile
            key={tile.label || index}
            label={tile.label}
            value={tile.value}
            state={tile.state}
            linkedEntity={tile.linkedEntity}
          />
        ))}
      </div>
    </section>
  );
}
