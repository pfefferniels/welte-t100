/**
 * The Mezzoforte pin.
 *
 * Hagmann says the pin of the closed Mezzofortebalg interrupts "Oeffnung oder
 * Schliessung" of the Nuancierbalg halfway. It does not arrest the bellows at one
 * level but at two, and it yields in the direction it is pushed: a board driven
 * down onto it comes to rest a little below the nominal level, one driven up
 * against it a little above. `thickness` is the width of that hysteresis, and
 * on the drawn line the rising rest is the higher of the two, which is the
 * opposite of what an inelastic barrier would give.
 *
 * The pin blocks both ways. Welte's own words, quoted in Hagemann's
 * Einstellanleitung: the Mezzofortebalg "versperrt dem Nuancierbalg den Weg,
 * sodaß solange jener zugesaugt ist, kein Ton stärker als Mezzoforte, oder
 * schwächer als Mezzoforte spielen kann". A floor-only reading was carried as an
 * option and priced on roll 3309; it never differed, because the line only ever
 * meets the hook from above (Reinhard Hagemann, "Einstellanleitung für
 * Welte-Mignon", Das Mechanische Musikinstrument 80, 2001, p. 26).
 *
 * The consequence for reading a roll is that a measured stop level is the rest
 * the bellows happened to arrive at, not the pin's centre. On roll 3309 all
 * twenty-two engagements happen with the line falling from the forte stop, so
 * what is measured there is the falling rest and the centre lies half a
 * thickness above it.
 */
/**
 * Only the pin's lower face is observable: a census of roll 3309 finds every hook
 * engagement entered from above, at the fortissimo rail, and the fastest approach
 * from below is 3.8 units/s against 14 to 16 at a real arrest. Fitting the
 * thickness therefore moved a face nothing touches, the output identical over the
 * whole range 0 to 0.3, so it is a constant here, kept at the value the earlier
 * reading used so that `mezzoforte` still carries the one observable quantity as
 * `mezzoforte - MF_THICKNESS / 2`. The pin's real thickness wants an instrument.
 */
export declare const MF_THICKNESS = 0.06;
export type StopState = {
    engaged: boolean;
    trappedAbove: boolean;
};
export declare function newStopState(): StopState;
/**
 * The arrested position: the board is held at the rest on its own side of the
 * pin. The hook itself does not move; what the line does on arrival is the
 * model's business, not the stop's.
 */
export declare function limitAtStop(state: StopState, engaged: boolean, current: number, moved: number, level: number, thickness: number): number;
