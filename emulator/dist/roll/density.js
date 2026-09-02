/**
 * How much is sounding, row by row.
 *
 * The blower is one supply feeding the note pneumatics and the relay alike, so
 * the model reads the note onsets of a half, and of both halves together, as a
 * load on it. What it wants is a rate, onsets per second, in a window centred
 * on each row.
 */
export function noteDensity(grid, onsetRows, windowSeconds = 0.5) {
    const counts = new Float64Array(grid.length);
    onsetRows.forEach((row) => {
        const index = grid.indexOfRow(row);
        counts[index] = counts[index] + 1;
    });
    const prefix = new Float64Array(grid.length + 1);
    counts.forEach((count, index) => {
        prefix[index + 1] = prefix[index] + count;
    });
    const span = grid.seconds.at(-1) - grid.seconds[0];
    const halfWindow = Math.max(Math.round(((windowSeconds / 2) * (grid.length - 1)) / span), 1);
    return Float64Array.from(counts, (_, index) => {
        const low = Math.max(index - halfWindow, 0);
        const high = Math.min(index + halfWindow, grid.length - 1);
        const seconds = grid.seconds[high] - grid.seconds[low];
        return seconds > 0 ? (prefix[high + 1] - prefix[low]) / seconds : 0;
    });
}
