/**
 * The latching relay of a red Welte, and the four conduits it opens.
 *
 * Six openings per half, in three set/cancel pairs. Each "on" valve carries a
 * doubled membrane chamber above it (Hagmann's Anhang 13: 24/25 over 22, 40/41
 * over 38, 55/56 over 53), which is the hold that lets a short punch set a
 * function until its cancel line is read. DRP 162 708's claim 3 states the
 * purpose: "daß man im Notenblatt nur kurze Öffnungen vorzusehen braucht, um
 * lang anhaltende Wirkungen hervorzubringen."
 *
 * What the relay hands the nuancing block is three flow paths:
 *
 *   - conduit 39 is always joined to the bellows and its far end is switched by
 *     the crescendo relay between blower vacuum and atmosphere, so it is one path
 *     with two targets. When crescendo is cancelled the refill runs through 39
 *     together with the throttled bore 100, which is why its conductance is
 *     fitted separately even though Hagmann says the two directions are regulated
 *     to take the same time.
 *   - conduit 23 is wider and opens only while the sforzando valve is set.
 *   - throttle 96 opens only while the cancelling perforation is present, and
 *     assists the reopening after a sforzando.
 *
 * Not modelled: throttle 97, which on a sforzando release dumps air straight into
 * the wind chamber and collapses the output pressure without moving the bellows,
 * and the regulator bellows 91, which acts on the cone valve and not on the
 * bellows either. Neither should appear in a line that records bellows travel.
 */
import type { Drive } from "../core/nuancing.ts";
import type { ModelInput, Parameters } from "../core/types.ts";
/** What one relay hands the nuancing block: the summed drive and the Mezzoforte pin. */
export type Relay = {
    readonly drive: Drive;
    readonly engaged: Uint8Array;
};
export declare function t100Relay(input: ModelInput, params: Parameters): Relay;
