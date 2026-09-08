/**
 * How a punched slot in the paper is named, so that the aperture geometry need
 * not know what a code means.
 *
 * The two scales code their functions differently: the T-100 punches a set line
 * and a cancel line for each, the T-98 one line held for as long as the function
 * lasts. A key that carried an action would force the second to invent one, so
 * the key is a plain string here and each scale narrows it to its own vocabulary.
 */

export type PortKey = string;

export function portKey(...parts: readonly string[]): PortKey {
  return parts.join(":");
}

/** One hole in the paper as the tracker bar meets it, already named for its port. */
export type PunchAt = {
  readonly key: PortKey;
  readonly rowOn: number;
  readonly rowOff: number;
};

export function portSeries(ports: ReadonlyMap<PortKey, Float64Array>, key: PortKey, length: number): Float64Array {
  return ports.get(key) ?? new Float64Array(length);
}
