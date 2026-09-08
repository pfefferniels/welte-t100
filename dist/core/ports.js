/**
 * How a punched slot in the paper is named, so that the aperture geometry need
 * not know what a code means.
 *
 * The two scales code their functions differently: the T-100 punches a set line
 * and a cancel line for each, the T-98 one line held for as long as the function
 * lasts. A key that carried an action would force the second to invent one, so
 * the key is a plain string here and each scale narrows it to its own vocabulary.
 */
export function portKey(...parts) {
    return parts.join(":");
}
export function portSeries(ports, key, length) {
    return ports.get(key) ?? new Float64Array(length);
}
