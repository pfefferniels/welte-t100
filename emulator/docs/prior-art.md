# Prior art: the two open-source T-100 ("red Welte") expression emulators

Reference account of `midi2exp` (C++, Stanford `pianoroll` project) and `pianolatron`
(JavaScript, SUL-CIDR), written as a basis for a TypeScript port.

Sources read:

- `/Users/nielspfeffer/Projects/midi2exp` at commit `8f50e78` ("test"), working tree clean
  for the files cited. Files: `include/Expressionizer.h`, `src/Expressionizer.cpp`,
  `src/MidiRoll.cpp`, `tools/midi2exp.cpp`, and `src/midifile/*` for library semantics.
- `sul-cidr/pianolatron`, branch `develop`, fetched 2026-08-31. Files:
  `src/expression-boxes/welte-red.js`, `src/expression-boxes/lib/expression-welte-mignon.js`,
  `src/expression-boxes/lib/in-app-expressionizer.js`, `src/expression-boxes/lib/pedaling.js`,
  `src/expression-boxes/welte-green.js`, `src/expression-boxes/welte-licensee.js`,
  `src/expression-boxes/index.js`, `src/config/roll-config.js`, `src/lib/utils.js`,
  `src/stores.js`. There is no README or design note in `src/expression-boxes/`; the only
  prose is in code comments.

Line numbers for pianolatron refer to the raw files as fetched; they are stable for the
`develop` snapshot but not for future commits.

Pianolatron's expression code is a port of midi2exp, not an independent model. The commit
that introduced it says so: "Calculate expressionized velocities for welte-red — This
cribbed and clipped from Peter's code, with only minor amendments." So the two agree by
descent, and the differences listed in section C are mostly artefacts of the port plus
later divergence.

## Glossary

| midi2exp | pianolatron | meaning |
|---|---|---|
| `welte_p` | `welte_p` | floor of the velocity range, also the initial value |
| `welte_mf` | `welte_mf` | the MF-hook level |
| `welte_f` | `welte_f` | ceiling of the velocity range |
| `welte_loud` | `welte_loud` | cap reached by slow crescendo alone, below `welte_f` |
| `slow_decay_rate` | `slow_decay_rate` | ms for the slow ramp to cross `welte_p`→`welte_mf` |
| `fastC_decay_rate` | `fastC_decay_rate` | ms for the fast crescendo to cross `welte_p`→`welte_mf` |
| `fastD_decay_rate` | `fastD_decay_rate` | ms for the fast decrescendo to cross `welte_f`→`welte_p` |
| `slow_step`, `fastC_step`, `fastD_step` | same names | derived rates, velocity units per ms |
| `isMF`, `isSlowC`, `isFastC`, `isFastD` (per-ms arrays) | `mf_start`, `slow_cresc_start`, `fast_cresc_start`/`_stop`, `fast_decresc_start`/`_stop` (latched timestamps) | the four valve states |
| `tracker_width` × `punch_fraction` | `tracker_diameter` × `punch_ext_ratio` = `tracker_extension` | hole-end extension, in ticks |
| `left_adjust` | `left_adjust` | additive bass velocity offset |
| `m_accelFtPerMin2` | `accelFtPerMin2` | take-up spool acceleration, ft/min² |
| `exp_bass` / `exp_treble` (dense ms array) | `panExpMap` (interval tree) + `bassExpCurve`/`trebleExpCurve` | the expression curve |
| "left hand" / "right hand" | "bass" / "treble" | the two halves of the roll |

---

## A. Expression code map for red Welte

Both projects use the same map, and both agree with the T-100 layout. midi2exp documents it
in the comment block at `src/Expressionizer.cpp:895-918`; pianolatron encodes it as data at
`src/config/roll-config.js:11-32`.

| MIDI key | Side | Function | midi2exp branch | pianolatron `ctrlMap` |
|---|---|---|---|---|
| 14 | bass | MF hook **off** | `Expressionizer.cpp:989` | `mf_off` |
| 15 | bass | MF hook **on** | `Expressionizer.cpp:1000` | `mf_on` |
| 16 | bass | slow crescendo **off** | `Expressionizer.cpp:1017` | `cresc_off` |
| 17 | bass | slow crescendo **on** | `Expressionizer.cpp:1009` | `cresc_on` |
| 18 | bass | sforzando **off** = fast **decrescendo** | `Expressionizer.cpp:1029` | `sf_off` |
| 19 | bass | sforzando **on** = fast **crescendo** | `Expressionizer.cpp:1034` | `sf_on` |
| 20 | bass | soft pedal (hammer rail) off | `SoftOffKey`… see note | `soft_off` |
| 21 | bass | soft pedal on | see note | `soft_on` |
| 22 | bass | motor off | ignored by the expression model | `motor_off` |
| 23 | bass | motor on | ignored | `motor_on` |
| 104 | treble | rewind | ignored | `rewind` |
| 105 | treble | electric cutoff | ignored | `elec_off` |
| 106 | treble | sustain pedal on | `PedalOnKey`, `Expressionizer.cpp:55` | `sust_on` |
| 107 | treble | sustain pedal off | `PedalOffKey`, `Expressionizer.cpp:56` | `sust_off` |
| 108 | treble | sforzando on = fast **crescendo** | `Expressionizer.cpp:1034` | `sf_on` |
| 109 | treble | sforzando off = fast **decrescendo** | `Expressionizer.cpp:1029` | `sf_off` |
| 110 | treble | slow crescendo on | `Expressionizer.cpp:1009` | `cresc_on` |
| 111 | treble | slow crescendo off | `Expressionizer.cpp:1017` | `cresc_off` |
| 112 | treble | MF hook on | `Expressionizer.cpp:1000` | `mf_on` |
| 113 | treble | MF hook off | `Expressionizer.cpp:989` | `mf_off` |

The treble numbering mirrors the bass: bass runs off/on, off/on, off/on upward from 14,
treble runs on/off, on/off, on/off downward from 113. Reading key 113 → 108 gives the same
sequence as 14 → 19. The pairing in code is therefore `{14,113}`, `{15,112}`, `{16,111}`,
`{17,110}`, `{18,109}`, `{19,108}`.

**Soft-pedal bug in midi2exp.** `setupRedWelte` sets `SoftOnKey = 22; SoftOffKey = 23`
(`src/Expressionizer.cpp:57-58`), i.e. the **motor** holes, while its own comment block and
pianolatron both put soft-pedal on/off at 21/20. The `setupLicenseeWelte` function, whose
comment block gives the same layout, uses `SoftOnKey = 21; SoftOffKey = 20`
(`src/Expressionizer.cpp:153-154`). So red Welte soft pedalling in midi2exp is driven by the
wrong two holes. This affects only pedalling, not the velocity curve.

Note the naming trap that both projects inherit: the hole called *sforzando off*
(bass 18 / treble 109) triggers the **fast decrescendo**, and *sforzando on* (bass 19 /
treble 108) the **fast crescendo**. Pianolatron's `ctrlFunc` names `sf_off`/`sf_on` keep
this confusing convention; midi2exp comments them as "Forzando off -- Fast Decrescendo".

---

## B. The midi2exp model

### B.1 State and constants

Class defaults, `include/Expressionizer.h`:

| Symbol | Value | Unit | Line |
|---|---|---|---|
| `welte_p` | 35.0 | MIDI velocity | `Expressionizer.h:108` |
| `welte_mf` | 60.0 | MIDI velocity | `Expressionizer.h:109` |
| `welte_f` | 90.0 | MIDI velocity | `Expressionizer.h:110` |
| `welte_loud` | 75.0 | MIDI velocity | `Expressionizer.h:111` |
| `left_adjust` | −5 | MIDI velocity, added to bass | `Expressionizer.h:133` |
| `punch_width` | 21.5 | px @300 dpi | `Expressionizer.h:117` — **never used** |
| `punch_fraction` | 0.75 | — | `Expressionizer.h:118` |
| `tracker_width` | 1.413 × 300.25 / 25.4 = 16.700 | px @300 dpi | `Expressionizer.h:120` |
| `tracker_fraction` | 0.75 | — | `Expressionizer.h:121` — **never used** |
| `m_accelFtPerMin2` | 0.2 | ft/min² | `Expressionizer.h:130` |
| `pan_bass` / `pan_treble` | 52 / 76 | MIDI CC10 | `Expressionizer.h:138,141` |

Red-Welte overrides, `setupRedWelte`, `src/Expressionizer.cpp:44-67`:

| Symbol | Value | Unit | Line |
|---|---|---|---|
| `slow_decay_rate` | 2380 | ms, `welte_p`→`welte_mf` | `Expressionizer.cpp:60` |
| `fastC_decay_rate` | 300 | ms, `welte_p`→`welte_mf` | `Expressionizer.cpp:61` |
| `fastD_decay_rate` | 400 | ms, `welte_f`→`welte_p` | `Expressionizer.cpp:62` |

Derived once in `setupRedWelte` (`src/Expressionizer.cpp:64-66`):

```
slow_step  =  (welte_mf - welte_p) / slow_decay_rate   =  (60-35)/2380 =  0.01050420  vel/ms
fastC_step =  (welte_mf - welte_p) / fastC_decay_rate  =  (60-35)/300  =  0.08333333  vel/ms
fastD_step = -(welte_f  - welte_p) / fastD_decay_rate  = -(90-35)/400  = -0.13750000  vel/ms
```

Note the asymmetric normalisation: crescendo rates are expressed over the `p`→`mf` span
(25 units), the decrescendo rate over the `p`→`f` span (55 units). Traversal times that
follow: slow cresc `p`→`mf` 2380 ms, `p`→`loud` 3808 ms; fast cresc `p`→`f` 660 ms;
slow decay `f`→`p` 5236 ms; fast decresc `f`→`p` 400 ms; slow + fast cresc together
0.09383 vel/ms, `p`→`f` in 586 ms.

CLI defaults actually in force, `tools/midi2exp.cpp`. The tool always calls
`setupRedWelte()` first (line 65) and then overrides only for `-g/-l/-h/-u`. With `-w`:

| Flag | Default | Effect | Line |
|---|---|---|---|
| `-w` | — | red Welte; `setRollTempo(94.6)`, `setAcceleration(0.3147)` | `midi2exp.cpp:100-104` |
| `-a` | off | apply the tracker-bar correction | `midi2exp.cpp:153-155` |
| `-k` | 16.7 | tracker bar height, px | `midi2exp.cpp:30` |
| `-f` | 0.75 | punch extension fraction | `midi2exp.cpp:29` |
| `-d` | 21.5 | punch diameter, px — **inert** | `midi2exp.cpp:27` |
| `--ac` | 0.2 | acceleration, ft/min² (overridden to 0.3147 by `-w`) | `midi2exp.cpp:60` |
| `--sd`, `--fc`, `--fd` | 2366, 254, 269 (the *green* values) | **inert**, see B.5 | `midi2exp.cpp:51-53` |
| `--wp/--wmf/--wf/--wl` | 35.0, 60.0, 90.0, **70.0** | partially effective, see B.5 | `midi2exp.cpp:54-57` |

`--wl` defaults to 70.0 in the CLI against 75.0 in the class and in pianolatron. It only
takes effect if the flag is passed.

The README (`README.md`) says the input must have 4 tracks and that tracks 1/2 are
"treble and bass"; both statements are wrong. `readMidiFile` requires exactly 5 tracks
(`src/Expressionizer.cpp:597-600`) and the code uses track 1 = bass notes, 2 = treble notes,
3 = bass expression, 4 = treble expression (`Expressionizer.h:170-173`).

### B.2 Pass 1 — decode valve states onto a per-millisecond grid

`calculateRedWelteExpression`, `src/Expressionizer.cpp:921-1039`. Run separately for
`left_hand` (track 3) and `right_hand` (track 4).

```
N   := floor(file_duration_seconds * 1000) + 1          # Expressionizer.cpp:951
exp[0..N-1]     := welte_p                              # :955
isMF, isSlowC, isFastC, isFastD  := false[N]            # :963-966

valve_mf_on := false;  valve_mf_start := 0
valve_slowc_on := false;  valve_slowc_start := 0

for each event e in expression track, in file order:    # :978
    if not e.isNoteOn(): continue                       # velocity-0 note-ons are skipped
    k  := e.key
    st := round(e.seconds * 1000)                       # :984
    et := round((e.seconds + e.duration_seconds) * 1000) # :985

    if k in {14, 113}:                       # MF off
        if valve_mf_on: isMF[valve_mf_start .. st-1] := true
        valve_mf_on := false
    elif k in {15, 112}:                     # MF on
        if not valve_mf_on: valve_mf_on := true; valve_mf_start := st
    elif k in {17, 110}:                     # slow cresc on
        if not valve_slowc_on: valve_slowc_on := true; valve_slowc_start := st
    elif k in {16, 111}:                     # slow cresc off
        if valve_slowc_on: isSlowC[valve_slowc_start .. st-1] := true
        valve_slowc_on := false
    elif k in {18, 109}:  isFastD[st .. et-1] := true    # fast decrescendo
    elif k in {19, 108}:  isFastC[st .. et-1] := true    # fast crescendo
```

So: **MF hook and slow crescendo latch** (on-hole to off-hole, hole length irrelevant),
**fast cresc/decresc are gated by hole duration** only. That matches the mechanism: MF and
slow-cresc are lock-and-cancel valves, the sforzando holes are direct-acting.

The retroactive fill is the weak point. `isMF` and `isSlowC` are written only when the
*off* hole is found. There is an explicit `// TODO: deal with the last case (if crescendo
OFF is missing)` at `src/Expressionizer.cpp:1041`. If a roll ends with the MF valve or the
crescendo valve still open, that trailing region silently gets the valve *off*. Pianolatron
latches instead, so the two diverge exactly there.

### B.3 Pass 2 — integrate, one millisecond at a time

`src/Expressionizer.cpp:1059-1125`. `eps = 0.0001` (`:1046`).

```
for i in 1 .. N-1:
    if not isSlowC[i] and not isFastC[i] and not isFastD[i]:
        amount := -slow_step                             # slow decay is the default state
    else:
        amount := isSlowC[i]*slow_step
                + isFastC[i]*fastC_step
                + isFastD[i]*fastD_step                  # :1068

    exp[i] := exp[i-1] + amount                          # :1078-1081

    if isMF[i]:                                          # MF hook  :1083
        if exp[i-1] > welte_mf:
            exp[i] := (amount < 0) ? max(welte_mf + eps, exp[i])
                                   : min(welte_f,        exp[i])
        elif exp[i-1] < welte_mf:
            exp[i] := (amount > 0) ? min(welte_mf - eps, exp[i])
                                   : max(welte_p,        exp[i])
        # exp[i-1] == welte_mf exactly: no action
    else:
        if isSlowC[i] and not isFastC[i] and exp[i-1] < welte_loud:   # :1116
            exp[i] := min(exp[i], welte_loud - eps)

    exp[i] := max(welte_p, exp[i])                       # :1121
    exp[i] := min(welte_f, exp[i])                       # :1122
```

Points worth carrying into a port:

- The slow decay is **not** superposed on the other states. Whenever any of slow-cresc,
  fast-cresc or fast-decresc is active, the decay term drops out entirely. Only the active
  terms are summed.
- Simultaneous fast cresc + fast decresc gives `0.08333 - 0.1375 = -0.05417` vel/ms, a net
  slower fall than fast decresc alone. Whether that is right mechanically is untested.
- The MF hook is a **soft clamp evaluated per millisecond**: while the hook is on, the curve
  cannot cross `welte_mf`; it parks at `welte_mf ± eps` and stays there while the driving
  rate keeps pushing into it.
- The `welte_loud` cap applies only when the hook is off, slow cresc is on, fast cresc is
  off, and the *previous* value was already below `welte_loud`. The guard
  `exp[i-1] < welte_loud` means a curve already above `welte_loud` is not pulled back down.
- `isSlowC` and friends are `vector<double>` used as booleans and then multiplied into
  `amount` (`:1068`). It works because they hold 0.0/1.0, but it is fragile.
- `.at(j)` in the pass-1 fills will throw `std::out_of_range` if an expression event's
  end time exceeds the computed file duration. After a tracker-bar correction near the end
  of a roll this is reachable.

### B.4 Applying the curve to notes

`applyExpression`, `src/Expressionizer.cpp:728-769`. For each note-on in the bass (track 1)
or treble (track 2) track:

```
ms       := min(round(note.seconds * 1000), N-1)
velocity := round(exp[ms])
if velocity == 0: velocity := getPreviousNonzero(exp, ms)      # :752-754
if bass:          velocity := max(velocity + left_adjust, 0)   # :756-758
if velocity == 0: velocity := 60                               # :761-763
note.velocity := velocity
```

The velocity is sampled at the note **onset** only; nothing changes during the note.
`getPreviousNonzero` (`:787-796`, falls back to `welte_mf`) is unreachable with the default
`welte_p = 35`; it is dead code unless someone sets `welte_p` to 0.

### B.5 Things that look like bugs rather than modelling choices

1. **`--sd`, `--fc`, `--fd` do nothing.** `setSlowDecayRate` / `setFastCrescendo` /
   `setFastDecrescendo` (`src/Expressionizer.cpp:2076-2102`) assign the *rate* but never
   recompute `slow_step` / `fastC_step` / `fastD_step`, which were computed once inside
   `setupRedWelte` (`:64-66`) before the options are parsed. Verified empirically: running
   the same roll with `--fc 100`, `--fd 150`, `--sd 1000` produces **byte-identical note
   velocities** (0 of 9593 notes differ). The three tunables the parameter fitting would
   most want are not reachable from the CLI at all.
2. **`--wp/--wmf/--wf` are half-effective.** They set `welte_p` etc., which are read live by
   the clamps and by the array fill, but the *step rates* still hold the values from
   `setupRedWelte`. Empirically `--wp 20` changes 505 of 9593 velocities (max |Δv| = 41) —
   real but incoherent, since the ramp slopes no longer match the endpoints.
3. **`applyAcceleration` has no effect on the computed velocities.** See section E. Verified
   empirically: `--ac 0`, `--ac 0.3147` and `--ac 0.9` give identical velocities.
4. **Red-Welte soft pedal reads the motor holes** (22/23 instead of 21/20),
   `src/Expressionizer.cpp:57-58`.
5. **`punch_width` / `-d` and `tracker_fraction` are dead.** Only `tracker_width` ×
   `punch_fraction` reaches the correction; `grep punch_width src/Expressionizer.cpp` finds
   only the accessors (`:1902, :1931`).
6. **Missing note-off silently disables a sforzando.** `getDurationInSeconds`
   (`src/midifile/MidiEvent.cpp:267-278`) returns 0 for an unlinked note-on, so `et == st`
   and the fill loop never runs.
7. **The licensee variant uses a different `fastD_step` numerator** —
   `-(welte_mf - welte_p)` (`src/Expressionizer.cpp:162`) against `-(welte_f - welte_p)`
   for red and green. Probably a typo; pianolatron does not reproduce it.
8. The constructor calls `setupGreenWelte()` (`src/Expressionizer.cpp:34`) despite the
   comment claiming red is the default. Harmless in the CLI, which calls `setupRedWelte()`
   explicitly.

---

## C. The pianolatron model

### C.1 Where the parameters live

`src/expression-boxes/welte-red.js:8-22`, as `defaultExpressionParams.tunable`. They are
copied into the Svelte store `expressionParameters` (`src/stores.js:123`) on first
initialisation (`in-app-expressionizer.js:202-204`) and re-read from the store thereafter,
so the UI can retune them live.

| Parameter | Value | Line |
|---|---|---|
| `welte_p` | 35.0 | `welte-red.js:10` |
| `welte_mf` | 60.0 | `welte-red.js:11` |
| `welte_f` | 90.0 | `welte-red.js:12` |
| `welte_loud` | 75.0 | `welte-red.js:13` |
| `left_adjust` | −5.0 | `welte-red.js:14` |
| `slow_decay_rate` | 2380 | `welte-red.js:15` |
| `fastC_decay_rate` | 300 | `welte-red.js:16` |
| `fastD_decay_rate` | 400 | `welte-red.js:17` |
| `tracker_diameter` | 16.7 px | `welte-red.js:18` |
| `punch_ext_ratio` | 0.75 | `welte-red.js:19` |
| `accelFtPerMin2` | 0.3147 | `welte-red.js:20` |

Derived, `expression-welte-mignon.js:45-54` — identical formulas to midi2exp, plus:

```
tracker_extension = parseInt(tracker_diameter * punch_ext_ratio, 10)   // = 12 ticks
```

The UI slider metadata is in `in-app-expressionizer.js:39-93`. Two of the aliases there are
wrong: `slow_decay_rate` is labelled "slow de/cresc (ms/vel)" and the comment at
`welte-red.js:15` reads "rates are in steps/ms, i.e., 1 step in 2.38s". Both suggest the
value is per velocity unit; it is the ms for the whole `welte_p`→`welte_mf` span, as
midi2exp's own output metadata correctly states ("2380 ms (time from welte_p to welte_mf)",
`src/Expressionizer.cpp:703-704`).

### C.2 The algorithm

Two stages. Stage 1 walks the control track and builds an interval tree of *linear
segments*; stage 2 assigns note velocities by interpolating inside a segment.

```
# --- stage 1: buildNoteVelocitiesMap / panExpMapReducer -----------------------
# in-app-expressionizer.js:264-273, welte-red.js:49-125

state := { velocity: welte_p, time: 0.0,
           mf_start: null, slow_cresc_start: null, slow_decresc_start: null,
           fast_cresc_start: null, fast_cresc_stop: null,
           fast_decresc_start: null, fast_decresc_stop: null }
                                            # expression-welte-mignon.js:8-18, :21-23

events := controlTrack
            .filter(name == "Note on")                        # includes velocity-0 ends
            .map(extendControlHoles)                          # welte-red.js:24-47
            .sort(by tick)                                    # in-app-expressionizer.js:269

for each (noteNumber, velocity, tick) in events:
    f := ctrlMap[noteNumber]
    if f not in {sf_on, sf_off, cresc_on, cresc_off, mf_on, mf_off}: skip   # :57-62
    if velocity == 0 and f not in {sf_on, sf_off}: skip                     # :67-68

    t := convertTicksAndTime(tick)                            # ticks -> ms
    v := getVelocityAtTime(t, state)                          # integrate to here

    switch f:
      mf_on:      state.mf_start := t
      mf_off:     state.mf_start := null
      cresc_on:   state.slow_cresc_start := t; state.slow_decresc_start := null
      cresc_off:  state.slow_cresc_start := null; state.slow_decresc_start := t
      sf_on:      velocity>0 ? (fast_cresc_start   := t; fast_cresc_stop   := null)
                             : (fast_cresc_stop    := t)
      sf_off:     velocity>0 ? (fast_decresc_start := t; fast_decresc_stop := null)
                             : (fast_decresc_stop  := t)

    panExpMap.insert(state.time, t, [state.velocity, v, state.time, t])
    state.time := t;  state.velocity := v

# tail segment out to the last note or control hole  (:277-291)
finalTime := convertTicksAndTime(max(lastNoteTick, lastCtrlTick))
panExpMap.insert(state.time, finalTime, [state.velocity,
                                         getVelocityAtTime(finalTime, state),
                                         state.time, finalTime])
```

`getVelocityAtTime`, `expression-welte-mignon.js:57-124`:

```
dt := time - state.time
v  := state.velocity
fastC := (fast_cresc_start   != null) and (fast_cresc_stop   == null)
fastD := (fast_decresc_start != null) and (fast_decresc_stop == null)

if slow_cresc_start == null and not fastC and not fastD:
    v -= dt * slow_step                                       # :81
else:
    v += (slow_cresc_start != null) ? dt * slow_step  : 0     # :85-88
    v += fastC ? dt * fastC_step : 0
    v += fastD ? dt * fastD_step : 0

delta := v - state.velocity
if mf_start != null:                                          # :96
    if state.velocity > welte_mf:
        v := delta < 0 ? max(welte_mf + 0.001, v) : min(welte_f, v)
    elif state.velocity < welte_mf:
        v := delta > 0 ? min(welte_mf - 0.001, v) : max(welte_p, v)
elif slow_cresc_start != null and not fastC and state.velocity < welte_loud:
    v := min(v, welte_loud - 0.001)                           # :117

return clamp(v, welte_p, welte_f)                             # :121
```

```
# --- stage 2: note velocities  (in-app-expressionizer.js:294-315) -------------
for each note-on with velocity > 0:
    t := convertTicksAndTime(tick)
    [v0, v1, t0, t1] := panExpMap.search(t, t)[0]
    noteVelocity := v0 + (v1 - v0) * (t - t0) / (t1 - t0)      # linear interpolation
    store noteVelocity + adjust                                # adjust = left_adjust for bass, 0 for treble
```

`left_adjust` is added without a lower clamp and the velocity is not rounded to an integer
(`:310-313`). With the defaults the minimum is 30, so nothing goes negative.

### C.3 The consequence of segment-wise integration

This is the deepest difference from midi2exp and it is easy to miss. Pianolatron evaluates
the model **only at control-hole times**, then draws a straight line between consecutive
evaluations. Clamping therefore applies at segment endpoints, not along the path. Any
saturation that happens *inside* a segment is lost.

Worked example, red Welte defaults, MF hook on, velocity 35, a 400 ms fast-crescendo hole
with the next control event 400 ms later:

- midi2exp: ramps at 0.08333 vel/ms, hits the hook at 59.999 after 300 ms, then flat. A
  note at t = 200 ms gets **51.67**; at t = 350 ms it gets **59.999**.
- pianolatron: endpoint = min(59.999, 35 + 400 × 0.08333 = 68.33) = 59.999; the segment is
  the straight line 35 → 59.999 over 400 ms. A note at t = 200 ms gets **47.50**; at
  t = 350 ms **56.87**.

A discrepancy of 3–4 velocity units on exactly the fast-crescendo attacks that carry the
most musical weight. The same happens against the `welte_p`, `welte_f` and `welte_loud`
clamps whenever a segment runs long enough to saturate.

### C.4 Difference table

| # | Aspect | midi2exp | pianolatron | Stated justification |
|---|---|---|---|---|
| 1 | Integration domain | dense array, 1 ms per cell, `exp[i] = exp[i-1] + amount` (`Expressionizer.cpp:1059-1081`) | closed form per segment, evaluated only at control-hole times, linear interpolation between (`in-app-expressionizer.js:299-307`) | None. Pianolatron's rationale is implicit: it has to run in a browser during playback. |
| 2 | Where clamps bite | every millisecond, so saturation is represented (`Expressionizer.cpp:1083-1122`) | segment endpoints only; a saturating segment becomes a straight ramp (`expression-welte-mignon.js:96-121`) | None. This is the largest behavioural divergence — see C.3. |
| 3 | MF hook / slow-cresc state | reconstructed retroactively at the *off* hole; a missing off leaves the region unhooked, with an explicit `// TODO` (`Expressionizer.cpp:989-1027, :1041`) | latched forward from the *on* hole; a missing off keeps the state to the end of the roll (`welte-red.js:74-90`) | midi2exp admits the gap. Pianolatron is silently the more sensible behaviour. |
| 4 | Missing sforzando note-off | duration 0 → the hole is ignored entirely (`MidiEvent.cpp:267-271`) | `stop == null` → the fast change runs to the end of the roll (`expression-welte-mignon.js:68-72`) | None on either side. Opposite failure modes. |
| 5 | Sforzando latching | strictly hole-duration gated, `[st, et)` (`Expressionizer.cpp:1029-1038`) | hole-duration gated via start/stop timestamps — same semantics when both events are present | Both comment that the sforzando hole is the one whose length matters. |
| 6 | Tracker extension, value | `int(16.7 × 0.75 + 0.5) = 13` ticks, rounded (`Expressionizer.cpp:1878`) | `parseInt(16.7 × 0.75) = 12` ticks, truncated (`expression-welte-mignon.js:50-53`) | None. A 1-tick (≈1.75 ms) systematic offset. |
| 7 | Tracker extension, scope | every note-off on **every** track, including the note tracks; opt-in via `-a` (`Expressionizer.cpp:1879-1886`) | only the *end* events of `sf_on`, `sf_off`, `sust_off`, `soft_off` control holes, always on; note holes are extended separately at playback time (`welte-red.js:34-45`, `in-app-expressionizer.js:400-407`) | Pianolatron's comment explains the split. midi2exp's blanket approach also extends mf/cresc off-holes, which is harmless since only their onsets are read. |
| 8 | Acceleration model | linear in *time*, `speed = start + minute × a` (`MidiRoll.cpp:337-354`) | same formula, same 0.1-minute step (`in-app-expressionizer.js:238-249`) | Commit `6a29060` "Use kinematic acceleration emulation" replaced an earlier per-foot model. |
| 9 | Does acceleration reach the velocity curve? | **No.** The tempo events are written but the time map is never invalidated, so `me->seconds` is stale (see E). Verified empirically. | **Yes.** `convertTicksAndTime` walks the in-app tempo map before every evaluation (`in-app-expressionizer.js:121-177`). | None; midi2exp's is a bug. |
| 10 | Base tick rate | `setTPQ(round(tempo × 6))`; `-w` forces tempo 94.6 → **TPQ 568**, overriding the file's division (`Expressionizer.cpp:526`, `midi2exp.cpp:101`) | uses the file's own `TICKS_PER_QUARTER` from roll metadata (`in-app-expressionizer.js:23`) → **570** for SUPRA | midi2exp's 94.6 carries only the bare comment `//94.6`. |
| 11 | Acceleration default | class default 0.2; `-w` sets 0.3147 (`Expressionizer.h:130`, `midi2exp.cpp:103`) | 0.3147 for red and licensee, 0.2 for green with `// TODO Double check` (`welte-red.js:20`, `welte-green.js:20`) | None for 0.3147 in either repo. |
| 12 | Initial conditions | whole array pre-filled with `welte_p`, integration starts at index 1 (`Expressionizer.cpp:955, :1059`) | `state.velocity = welte_p`, `state.time = 0` (`expression-welte-mignon.js:21-23`) | Equivalent. Both decay from `welte_p` before the first hole and are held there by the floor clamp. |
| 13 | `slow_decresc_start` | no equivalent | written at every `cresc_off` (`welte-red.js:89`) but **never read** — dead state | None. |
| 14 | Velocity output | rounded to int; bass floored at 0 (`Expressionizer.cpp:750, :757`) | left as a float, no floor (`in-app-expressionizer.js:310-313`) | None. |
| 15 | Repeated on-holes | second `mf_on`/`cresc_on` while already on is ignored, original start kept (`Expressionizer.cpp:1002, :1010`) | overwrites the start timestamp | No behavioural difference: only the presence of the timestamp is ever read. |
| 16 | Retuning the rates | impossible from the CLI, see B.5.1 | live via the store; `computeDerivedExpressionParams` re-runs on change | Pianolatron's commit "Recompute derived exp params when tunable params are changed" calls this "crucial to achieving full in-app expression emulation". |
| 17 | Soft-pedal holes | 22/23, the motor holes (`Expressionizer.cpp:57-58`) | 21/20 (`roll-config.js:18-19`) | midi2exp's own comment block contradicts its code. |
| 18 | Licensee `fastD_step` | `-(welte_mf - welte_p)/rate` (`Expressionizer.cpp:162`) | `-(welte_f - welte_p)/rate`, the shared mixin | Not relevant to T-100, noted for completeness. |

Robustness note on pianolatron: two control holes at the same tick produce a zero-length
interval, and `(t - t0)/(t1 - t0)` is then `0/0 = NaN`. `panExpMap.search(t, t)[0]` also
picks arbitrarily among intervals that meet at a boundary. Worth guarding in a port.

---

## D. Tracker-bar / punch-extension correction

The physical point: a tracker-bar hole has a finite diameter, so the vacuum signal persists
after the trailing edge of the perforation has passed the centreline. Both projects model
this by extending hole *ends* by a fixed number of pixel rows and touching no hole *starts*.

**midi2exp**, `applyTrackBarWidthCorrection`, `src/Expressionizer.cpp:1868-1892`:

```
correction = int(tracker_width * punch_fraction + 0.5)        # :1878
           = int(16.700 * 0.75 + 0.5) = int(13.025) = 13 ticks

for every track, for every event with isNoteOff():
    event.tick += correction                                  # :1884
sortTracks(); doTimeAnalysis(); linkNotePairs()               # :1888-1889
```

`tracker_width = 1.413 × 300.25 / 25.4 = 16.700 px` (`Expressionizer.h:120`), i.e. a
1.413 mm tracker-bar hole at the 300.25 dpi Stanford scan resolution. The CLI exposes it as
`-k` with default 16.7 (`midi2exp.cpp:30`) and the fraction as `-f`, default 0.75
(`midi2exp.cpp:29`). Applied only with `-a`, once — a second call refuses
(`Expressionizer.cpp:1873-1876`). The correction is applied to note-offs on **all five
tracks**, so note durations and control-hole durations both shift.

Empirically, `-a` changes 5325 of 9593 note velocities on the test roll, max |Δv| = 18. It
is not a cosmetic correction.

**pianolatron**, `expression-welte-mignon.js:50-53` and `welte-red.js:24-47`:

```
tracker_extension = parseInt(tracker_diameter * punch_ext_ratio, 10)   // ticks
                  = parseInt(16.7 * 0.75) = parseInt(12.525) = 12 ticks

extendControlHoles(item):
    f = ctrlMap[item.noteNumber]
    if f == null or item.velocity != 0: return item                    // starts untouched
    if f not in {sf_on, sf_off, sust_off, soft_off}: return item
    item.tick += tracker_extension
    return item
// the event list is re-sorted afterwards (in-app-expressionizer.js:269)
```

and for note holes, applied at playback rather than to the data
(`in-app-expressionizer.js:399-407`):

```
ticksPerSec = tempo * midiTPQ / 60
stopNote(note, `+${tracker_extension / ticksPerSec}` seconds)
```

Two things to get right in a port:

1. **12 vs 13 ticks.** `parseInt` truncates, `int(x + 0.5)` rounds. At the SUPRA start speed
   (570 ticks/s) that is 21.05 ms against 22.81 ms; near the end of the roll (≈640 ticks/s)
   18.75 ms against 20.31 ms. The extension is a constant number of *ticks*, so its duration
   in ms shrinks as the roll accelerates — both projects agree on that, and it is physically
   right: the hole passes the bar faster.
2. **Scope.** midi2exp extends every note-off including MF and slow-crescendo off-holes.
   Since those functions latch on the *onset* of the off-hole, extending their ends changes
   nothing. The only functional targets are the sforzando holes (and, for playback, the
   note holes and the pedal off-holes). Pianolatron restricts to exactly those. A port
   should follow pianolatron here; it is the same result with less collateral.

Neither project extends hole *starts*, so both implicitly place the valve's opening at the
leading edge and its closing one hole-diameter late. A symmetric model (open late, close
late) or a threshold-crossing model would move both edges; that is an open question, not
something either project addresses.

---

## E. Timing model, and the double-counting question

### E.1 midi2exp

Tempo is carried by the **header division**, not by tempo meta messages. `MidiRoll.cpp:68-97`
explains the convention: one tick is one image pixel row at 300 dpi, and

```
TPQ = tempo / 10 * dpi * 12 / 60            # MidiRoll.cpp:85
    = tempo * 6                             # at dpi = 300
```

so "tempo 100" means the roll starts at 10.0 ft/min = 36000 rows/min, and with a reference
60 bpm each quarter note is 600 rows. `Expressionizer::setRollTempo` duplicates the formula
inline as `setTPQ(int(tempo * 6 + 0.5))` (`Expressionizer.cpp:526`). For red Welte the CLI
passes 94.6, giving **TPQ 568** — note that this *overrides* whatever division the input file
carried, without rescaling any tick values.

`MidiRoll::applyAcceleration`, `src/MidiRoll.cpp:337-354`:

```
removeAcceleration()             # delete every tempo meta event, insert tempo 60 at tick 0
ticksPerFt := lengthDpi * 12                  = 3600
startspeed := TPQ * 60 / ticksPerFt           = TPQ / 60   ft/min
speed      := startspeed;  tempo := 60.0;  minute := 0.0;  tick := 0
while tick < maxTick:
    addTempo(track 0, tick, tempo)
    minute += 0.1
    tick   += int(speed * 0.1 * ticksPerFt)   # advances using the *old* speed
    speed   = startspeed + minute * accelFtPerMin2
    tempo   = speed * ticksPerFt / TPQ
```

That is constant acceleration in *time*, resampled onto a staircase of 0.1-minute segments.
With TPQ 568 the start speed is 9.4667 ft/min; with `-w`, `accelFtPerMin2 = 0.3147`.

**`applyAcceleration` does not affect the computed velocities.** `midifile`'s time map is
only rebuilt when `m_timemapvalid == 0` (`src/midifile/MidiFile.cpp:1312-1317`), and nothing
in the acceleration path clears that flag: `addTempo` writes straight into the event list
via `push_back_no_copy` and skips the invalidation that `addEvent`/`addMetaEvent` perform
(`MidiFile.cpp:1706-1712` against `:1509, :1560`), and neither `removeEmpties` (`:788-792`)
nor `sortTrack` (`:2288-2294`) touches it. The last valid analysis is the one from
`readMidiFile` / `setRollTempo` / `applyTrackBarWidthCorrection`
(`Expressionizer.cpp:604, 527, 1889`). So `me->seconds` in `calculateRedWelteExpression`
(`:984-985`) and `applyExpression` (`:748`) still reflects the **input file's own tempo map**,
reinterpreted at the newly forced TPQ. The recomputed acceleration reaches only the output
MIDI's tempo track.

Verified on `roll-nuance-tracer/cache/jq774vx6544/jq774vx6544_raw.mid` (tracks 0–4; the
6th track is empty and was dropped to satisfy the 5-track check):

| Run | notes | velocities differing from `--ac 0` | max &#124;Δv&#124; |
|---|---|---|---|
| `-w --ac 0` | 9593 | — | — |
| `-w --ac 0.3147` | 9593 | **0** | 0 |
| `-w --ac 0.9` | 9593 | **0** | 0 |
| `-w` on the same file with its tempo map stripped | 9593 | **6930** | 39 |

So for midi2exp there is no double-counting, but for the opposite reason from the one you
would expect: the integration runs on the *input* tempo map and midi2exp's own acceleration
model is decorative. If the input is a Stanford note MIDI with a single tempo-60 event, the
whole expression curve is computed at constant speed.

### E.2 pianolatron

`#buildTempoMap`, `in-app-expressionizer.js:215-255`, is the same kinematic model, written
into an interval tree rather than into the file:

```
lengthPPI  := 300            # hard-coded, "scan resolution should always be 300ppi"
ticksPerFt := 3600
startSpeed := midiTPQ * 60 / ticksPerFt
speed := startSpeed; tempo := 60; minute := 0; tick := 0
while tick < IMAGE_LENGTH - FIRST_HOLE:                  # roll metadata, not maxTick
    minute  += 0.1
    nextTick = tick + parseInt(speed * 0.1 * ticksPerFt, 10)
    speed    = startSpeed + minute * accelFtPerMin2
    nextTempo= speed * ticksPerFt / midiTPQ
    tempoMap.insert(tick, nextTick, tempo)
    tick = nextTick; tempo = nextTempo
tempoMap.insert(tick, Infinity, tempo)
```

`convertTicksAndTime` (`:121-177`) then walks that tree to turn ticks into ms and back, and
every expression evaluation goes through it. Unlike midi2exp, the acceleration genuinely
shapes the velocity curve.

The comment at `:216-219` states the intent: "It's possible for the note MIDI file to include
tempo events that emulate roll acceleration … It is preferable however to emulate roll
acceleration for in-app expression by building a tempo map directly within the app."

**Where pianolatron can double-count.** The store `useMidiTempoEventsOnOff` defaults to
`true` (`src/stores.js:83`). It gates two unrelated things:

- in `convertTicksAndTime` (`:126-133`) it selects the **in-app** tempo map over a flat
  60 bpm — despite the name, the file's tempo events never enter here;
- in `midiEventHandler` (`:417-429`) it decides whether embedded `Set Tempo` events are
  passed to the sample player.

With the default on and a note MIDI that *does* carry an acceleration tempo map — which is
exactly the SUPRA case — the audible playback tempo is driven by the file's tempo events
while the velocity curve was computed against pianolatron's own map. The comment at
`:420-423` acknowledges this: "those events will be enacted and thus override the in-app
tempoMap if present". So it is not a doubled acceleration but an inconsistent one: velocities
land at times that no longer match the curve they were sampled from. For a port fed SUPRA
files, pick one map and use it for both.

### E.3 What the SUPRA tempo map actually encodes

Measured directly from `cache/jq774vx6544/jq774vx6544_raw.mid`:

- format 1, 6 tracks (track 5 empty), **division 570**, i.e. roll tempo 95 → 9.5 ft/min;
- 54 tempo events on track 0, one every **3600 ticks = 1 foot**;
- tempo 60.0000, 60.1320, 60.2643, 60.3969 … The ratio between consecutive values is
  constant at **1.0021998**, to seven digits, from the first pair to the last.

So SUPRA's model is **geometric: speed × 1.0022 per foot of paper**, not linear in time.
That is `dv/dx = k·v` with `k = 0.0021974` per foot — the take-up spool radius growing by one
paper thickness per wrap. Expressed as `dv/dt = k·v²` it starts at **0.1985 ft/min²** and
reaches **0.2501 ft/min²** by the end of this roll, so a single constant `accelFtPerMin2`
cannot reproduce it.

This connects directly to midi2exp's history. Before commit `6a29060` ("Use kinematic
acceleration emulation", Peter Broadwell, 2021-08-14) `applyAcceleration` took
`(inches = 12.0, percent = 0.22)` and stepped the tempo once per foot; the exponential form
`tempo *= factor` is still there, commented out, with the shipped code using a linear
`factor += percent/100` instead. SUPRA's 0.22 % compounding per foot is that same
parameterisation with the multiplication left in. So the SUPRA tempo maps encode the
*pre-2021* Welte acceleration convention, and both current emulators use a different one.

Total roll time over 194 400 ticks under each model:

| Model | duration |
|---|---|
| SUPRA tempo map, division 570, 0.22 %/ft compounding | **321.95 s** |
| midi2exp `-w`: TPQ 568, linear a = 0.3147 | 315.24 s |
| pianolatron: TPQ 570, linear a = 0.3147 | 314.30 s |
| linear a = 0.2, TPQ 570 | 323.08 s |
| no acceleration, TPQ 570 | 341.05 s |

A linear-in-time acceleration of **0.2141 ft/min²** reproduces SUPRA's total duration at
TPQ 570; matching the whole curve rather than the endpoint would need the geometric form.
The 0.3147 used by both projects for red Welte runs the roll about 2.4 % short against the
SUPRA map.

**Recommendation for the port.** The SUPRA files already carry a complete, self-consistent
tempo map. Integrate against that map and set the emulator's own acceleration to zero, or
strip the map and use one acceleration model — but do not do both, and do not follow
midi2exp's TPQ override (568) when the file says 570.

**What this emulator does.** One model, built from the take-up spool's geometry after
Gottschewski pp. 135–137, in `src/roll/spool.ts`; the scan's tempo map is read only when
`--timing scan` asks for it. Both readings say the same thing to within 0.7 % of the roll's
duration and 1.6 % of any one step, and the drawn line cannot tell them apart at all, so the
reason for preferring his is that his 0.0075 cm and 4.64 s are measurements with a stated
source where the 0.22 % per foot is not. `docs/gottschewski.md` has the comparison.

---

## F. Empirically derived constants and their provenance

Every comment in either codebase that claims a measurement. All of them are in midi2exp;
pianolatron carries the numbers without the annotations.

| Constant | Value | Claimed measurement | Source cited | Location |
|---|---|---|---|---|
| Red `fastC_decay_rate` | 300 ms | "test roll shows around **170ms-200ms** from min to MF hook" | "test roll", unnamed | `Expressionizer.cpp:61`, `Expressionizer.h:216` |
| Red `fastD_decay_rate` | 400 ms | "test roll shows **166ms — 300ms** at max 400ms fast decrescendo can bring Max down to Min" | "test roll", unnamed | `Expressionizer.cpp:62`, `Expressionizer.h:217` |
| Red `slow_decay_rate` | 2380 ms | no measurement quoted; the header carries `//2380` and an alternative `2380.0 * 2.0` (commented) | — | `Expressionizer.cpp:60`, `Expressionizer.h:215` |
| Green `fastC_decay_rate` | 245 ms | "test roll shows **192 to 254ms** from min to MF" | "test roll" | `Expressionizer.cpp:82` |
| Green `fastD_decay_rate` | 269 ms | "test roll shows **176 to 269ms** from max to min" | "test roll" | `Expressionizer.cpp:83` |
| Green `slow_decay_rate` | 2455 ms | none | — | `Expressionizer.cpp:81` |
| Licensee `slow_decay_rate` | 2163 ms | "test rolls shows **2163ms** for treble SC from min to MF" | "test rolls" | `Expressionizer.cpp:156` |
| Licensee `fastC_decay_rate` | 220 ms | "test roll shows around **193ms-237ms** from min to MF" | "test roll" | `Expressionizer.cpp:157` |
| Licensee `fastD_decay_rate` | 186 ms | "test roll shows around **186ms** from MF to min" | "test roll" | `Expressionizer.cpp:158` |
| Licensee roll tempo | 79.8 | "welte licensee tempo to be 79.8 by examining the test roll" | test roll | `midi2exp.cpp:109-112` |
| Velocity map | min 30, MF 60, Loud 70, Max 85 | "Using **Peter's** velocity mapping" | Peter Broadwell | `Expressionizer.cpp:891, 1136, 1345` |
| Licensee `tracker_diameter` | 10.8 px | "**P. Phillips**: .5 mm smaller than Welte-Mignon" | Peter Phillips (pers. comm., presumably) | `welte-licensee.js:18` — the only provenance note in pianolatron |
| Red `tracker_diameter` | 16.7 px | derived, not measured: 1.413 mm × 300.25 px/in ÷ 25.4 mm/in | — | `Expressionizer.h:120` |
| Red roll tempo | 94.6 | none; bare `//94.6` | — | `midi2exp.cpp:101` |
| Red `accelFtPerMin2` | 0.3147 | **none, in either repository.** Introduced in commit `6a29060` alongside the kinematic model; appears twice in midi2exp (`midi2exp.cpp:48` commented, `:103` live) and once in pianolatron (`welte-red.js:20`), with no comment either place. | — | — |

Cautions for using these as a fitting prior:

- The shipped `fastC_decay_rate = 300` sits **50–75 % above** the quoted 170–200 ms
  measurement, and `fastD_decay_rate = 400` above the quoted 166–300 ms. Whoever tuned them
  deliberately slowed both relative to the test roll, and left no note saying why. The
  version history in `Expressionizer.h:203-222` shows the trajectory: `fastC` went
  700 → 1050 → 300, `fastD` 330 → 400, `slow_decay` 9520 → 4760 → 2380, under headings
  "before 0411" and "experiment 0411".
- The comparison is not apples to apples anyway: 170–200 ms is a measured *traversal time*
  from minimum to the MF hook, whereas `fastC_decay_rate` is the denominator of a linear
  rate that produces exactly that traversal only if the ramp really is linear. If the true
  bellows response is closer to exponential, a linear fit to a full trajectory will land at
  a different number from a fit to the endpoint.
- Note also which span each rate normalises. `fastC` and `slow` are per `welte_p`→`welte_mf`
  (25 units); `fastD` is per `welte_p`→`welte_f` (55 units). Changing `welte_f` therefore
  changes the fast-decrescendo *slope* but not the fast-crescendo slope.
- No Welte test roll is named anywhere. If you need the actual measurements, they are not in
  either repository.

---

## G. What neither model represents

Extending and sharpening the list you already have.

**1. Linear ramps instead of orifice-limited filling.** Both integrate a constant velocity
rate per active valve. The physical crescendo pneumatic fills through a fixed orifice against
a spring, so its travel is closer to `x(t) = x_∞(1 − e^(−t/τ))`: fast at first, asymptotic at
the end. Two consequences the linear model gets wrong in opposite directions. Short
sforzando punches (30–80 ms, common in Welte editing) reach *more* of their effect than a
linear ramp predicts, because the exponential is steepest at the start. Long crescendos
approach the ceiling *asymptotically* rather than hitting it and stopping, so the hard
`min(v, welte_f)` corner in both models has no physical counterpart. This also explains the
gap between the quoted 170–200 ms test-roll measurement and the shipped 300 ms: a single
linear rate cannot match both the initial slope and the total traversal time, so tuning it to
sound right over musical material inflates it relative to an endpoint measurement.

**2. Asymmetric fill and dump.** Both models use one rate per direction, but the crescendo
pneumatic fills through the valve orifice and empties through a different path, with
different effective areas. The measured ratio `fastD : fastC` in the test-roll comments
(166–300 ms against 170–200 ms, over spans of 55 and 25 velocity units respectively) already
implies the mechanism is markedly asymmetric; a two-time-constant model would let that fall
out rather than be imposed.

**3. No mechanical inertia and no valve delay.** The models respond instantaneously at the
tick where a hole opens. The real chain is tracker-bar hole → pouch → primary valve →
secondary valve → pneumatic, with a settling time of several tens of milliseconds before any
motion begins, plus a further delay before full flow. Two distinct effects are missing: a
pure transport delay (which shifts everything and can be absorbed into the tracker
extension), and a second-order roll-off (which cannot). Note that the tracker-bar correction
in both projects is applied only to hole *ends*, so it cannot model an onset delay at all —
it currently does double duty as both a geometric correction and an implicit lag.

**4. The MF hook as a soft clamp rather than a hard stop.** In both models the hook is
`min`/`max` against a velocity number, applied *after* the rate has been integrated, with an
`eps` fudge to keep the curve just off the boundary. Mechanically the MF hook is a stop that
arrests the crescendo pneumatic at the midpoint of its travel: the bellows physically cannot
pass it, the wind pressure behind it keeps building, and when the hook releases the motion
resumes from a *loaded* state. The consequences neither model has: the release is faster than
a fresh start from the same position; there is no possibility of the hook "leaking" as the
soft clamp effectively allows when several rates sum; and the `eps` values (0.0001 in
midi2exp, 0.001 in pianolatron) are pure numerics with no referent. The clamp also
implicitly assumes `welte_mf` sits at the geometric midpoint of travel, which is only true if
the velocity mapping is linear in travel — see point 8.

**5. No sforzando-off wind-chamber dump.** In the T-100 the sforzando-off (fast decrescendo)
hole vents the expression chamber to atmosphere. That is a large-orifice dump, not a reversal
of the fill path, and its rate depends on the *current* pressure — highest when loud, tailing
off as the pressure falls. Both models apply a constant `fastD_step` regardless of where the
curve currently sits. The test-roll comment "at max 400ms fast decrescendo can bring Max down
to Min" is consistent with a pressure-proportional dump being fitted by a single average
slope.

**6. No regulator bellows, so no note-density compensation.** The Welte stack has a regulator
that holds the playing vacuum against varying demand. Play a ten-note chord and the momentary
draw is far larger than for a single note, and the regulator's finite response means the
level actually sags and recovers. Neither model looks at the note track at all when computing
the expression curve — the curve for the bass side is a function purely of bass control
holes. So a dense passage and a single line at the same nominal expression level come out
identically. This is one of the clearest audible shortcomings.

**7. No coupling between the two halves.** Bass and treble are computed in complete isolation
(`calculateRedWelteExpression("left_hand")` then `("right_hand")`). The two stacks draw on a
shared pump and shared reservoir, so a heavy treble crescendo does load the bass side. Neither
model has any cross-term.

**8. Parameters live in velocity space, not bellows-travel space.** Every constant in both
projects is expressed in MIDI velocity units per millisecond. That silently asserts that
MIDI velocity is linear in pneumatic travel, and that travel is linear in the resulting
hammer speed. Neither holds: the vacuum-to-hammer-velocity curve is nonlinear, and the MIDI
velocity-to-loudness mapping of whatever sampler renders the output is nonlinear again. The
practical damage is that a rate fitted at one dynamic level does not transfer to another, and
that `welte_p`, `welte_mf`, `welte_f`, `welte_loud` cannot simultaneously be right as *travel*
landmarks and as *velocity* landmarks. A port that models bellows position in [0, 1] and maps
to velocity only at note onset would separate the mechanism from the rendering, and would
make the MF hook a genuine geometric midpoint.

**9. Velocity sampled at onset only, and quantised.** Both take a single value at the
note-on tick. Within a long note the expression level continues to change, which matters
for the roll's audible shape less than it matters for any attempt to *fit* the model against
a recording. midi2exp additionally rounds to an integer MIDI velocity, discarding roughly
0.5 units of resolution — against a total range of 55 units that is close to 1 %, and it is
applied after the bass offset, so bass and treble round differently.

**10. No hammer-rail (soft pedal) effect on the velocity curve.** Both projects route soft
pedal to MIDI CC67 and leave the expression curve untouched. On the instrument the hammer
rail physically shortens the blow distance, which is a multiplicative reduction in hammer
speed across the whole compass — a large effect, and one whose interaction with the
expression level is not additive.

**11. Discretisation artefacts that are not part of either model but affect its output.**
midi2exp's 1 ms integration grid is finer than the 1.75 ms tick grid, so it is not the
limiting factor; but its rounding of event times to whole milliseconds (`Expressionizer.cpp:984`)
quantises hole boundaries. Pianolatron's segment-wise evaluation has no grid at all but loses
saturation, as set out in C.3. A port integrating in ticks with clamping applied continuously
would avoid both.

**12. Everything upstream of the tracker bar.** Paper stretch and shrinkage, roll-edge
tracking, the finite width of the perforation in the direction *across* the roll, and the
fact that a punched hole in aged paper is not a clean rectangle. These are outside the scope
of both projects, but they set a floor on how precisely any hole-timing model can be
expected to match a real playback.

---

## H. Minimal reference values for the port

Red Welte, both projects' defaults:

```
welte_p    = 35      welte_mf   = 60      welte_f = 90      welte_loud = 75
left_adjust = -5 (bass only)

slow_decay_rate  = 2380 ms   ->  slow_step  = +0.01050420 vel/ms
fastC_decay_rate =  300 ms   ->  fastC_step = +0.08333333 vel/ms
fastD_decay_rate =  400 ms   ->  fastD_step = -0.13750000 vel/ms

tracker_diameter = 16.7 px   punch_ext_ratio = 0.75
  -> tracker_extension = 13 ticks (midi2exp, rounded) / 12 ticks (pianolatron, truncated)

accelFtPerMin2 = 0.3147   (no stated provenance in either repository)
roll tempo     = 94.6 (midi2exp, forces TPQ 568) / from file (pianolatron, 570 for SUPRA)
eps            = 0.0001 (midi2exp) / 0.001 (pianolatron)
```

Rule summary, in the order to apply it:

1. Slow decay runs by default. It is switched off, not superposed, whenever slow-cresc,
   fast-cresc or fast-decresc is active.
2. Otherwise sum the rates of the active states.
3. If the MF hook is on: the curve may not cross `welte_mf` from the side it was on.
4. Else if slow-cresc is on, fast-cresc is off, and the curve is below `welte_loud`: cap at
   `welte_loud`.
5. Clamp to `[welte_p, welte_f]`.
6. Note velocity = curve at the note onset, plus `left_adjust` on the bass side.

## I. Reproducing the empirical checks

Scratch files for the checks reported above are under
`/private/tmp/claude-501/-Users-nielspfeffer-Projects-roll-nuance-tracer/6b679fb7-144f-4cdf-a212-1b591f114a69/scratchpad/`
(`mid.py`, a minimal SMF reader/writer; `in5.mid`, the test roll reduced to five tracks).
midi2exp builds natively with

```
g++ -std=c++11 -O2 -Iinclude -Iinclude/midifile -o midi2exp \
    tools/midi2exp.cpp src/Expressionizer.cpp src/MidiRoll.cpp src/midifile/*.cpp
```

Multi-character options need a double dash (`--ac`, `--fc`, `--sd`); a single dash is parsed
as a cluster of short flags and fails.
