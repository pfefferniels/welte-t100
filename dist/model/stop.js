/**
 * The Mezzoforte pin.
 *
 * Hagmann says the pin of the closed Mezzofortebalg interrupts "Oeffnung oder
 * Schliessung" of the Nuancierbalg halfway. The pin is a physical object with
 * extent along the direction of travel, so it does not arrest the bellows at one
 * level but at two: a board descending onto it comes to rest against its upper
 * face, a board rising onto it against its lower face, and the band between them
 * cannot be occupied while the pin is down. `thickness` is that band.
 *
 * The consequence for reading a roll is that a measured stop level is the face
 * the bellows happened to arrive at, not the pin's centre. On roll 3309 all
 * twenty-two engagements happen with the line falling from the forte stop, so
 * what is measured there is the upper face and the centre lies half a thickness
 * below it.
 *
 * `twoSided` false keeps the weaker reading, where the pin only arrests a
 * descent, for comparison. With a pin actually in the path the two-sided
 * behaviour is what the geometry gives; the weaker one is kept because the roll
 * cannot distinguish them and a model should not assert what its evidence does
 * not carry.
 */
export function newStopState() {
    return { engaged: false, caught: false, trappedAbove: false };
}
/**
 * How far the bellows has pushed into the stop, signed so that a positive value
 * means it is past the face it is being held at. Zero when it is clear of it.
 *
 * A rigid wall would simply clamp, and the drawn line shows that is wrong: on
 * roll 3309 the line arriving at the hook from above overshoots the level it
 * settles at and springs back before coming to rest. So the contact is
 * compliant — the board arrives with momentum and the leaf and finger deflect —
 * and the model treats it as a stiff spring with damping rather than a clamp.
 */
export function penetration(state, engaged, moved, level, twoSided, thickness = 0) {
    if (!state.engaged || !engaged)
        return 0;
    const upper = level + thickness / 2;
    const lower = level - thickness / 2;
    if (state.trappedAbove || state.caught)
        return moved < lower ? lower - moved : 0;
    return twoSided && moved > upper ? moved - upper : 0;
}
export function limitAtStop(state, engaged, current, moved, level, twoSided, thickness = 0) {
    const upper = level + thickness / 2;
    const lower = level - thickness / 2;
    if (!engaged) {
        state.engaged = false;
        state.caught = false;
        return moved;
    }
    if (!state.engaged) {
        state.engaged = true;
        state.trappedAbove = current >= level;
        state.caught = current >= upper;
    }
    if (current >= upper)
        state.caught = true;
    // The two arrest levels are a hysteresis and not an excluded band: a bellows
    // driven down onto the hook comes to rest a little below the nominal level, one
    // driven up against it a little above. The hook itself does not move — the line
    // rebounds off it rather than sinking into it, which `stopRestitution` in the
    // model is for. Only the falling face is measured on this roll. A census of the
    // 22 hook engagements finds every one entered from above, at the fortissimo
    // rail, on both halves and over the whole roll: the falling arrests are 144
    // (bass) and 206 (treble) arriving at 14 to 16 units/s and resting at
    // 0.5752 +/- 0.0043 and 0.6188 +/- 0.0074. The upward approaches once read as
    // arrivals from below are pauses in a creep, the fastest of them 3.8 units/s,
    // and they scatter 0.031 to 0.032 above the falling rest rather than settling
    // on a second face. So the pin's upper face is never reached here and its
    // separation is not measured; `mfThickness` is pinned in `cli/settings.ts` for
    // that reason. Welte has the pin blocking both ways, quoted in Hagemann's
    // Einstellanleitung, which is why `mfTwoSided` stays set.
    if (twoSided)
        return state.trappedAbove ? Math.max(moved, lower) : Math.min(moved, upper);
    return state.caught ? Math.max(moved, lower) : moved;
}
