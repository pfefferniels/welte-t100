import tempfile
import unittest
from pathlib import Path

import numpy as np

from nuance import calibrate, edits, rules, segment, trace


def brute_force_relax(values, penalty):
    index = np.arange(values.size)
    total = values[None, :] + penalty * np.abs(index[:, None] - index[None, :])
    return total.min(axis=1), total.argmin(axis=1)


class Relaxation(unittest.TestCase):
    def test_matches_brute_force(self):
        generator = np.random.default_rng(0)
        for penalty in (0.0, 0.05, 1.0, 5.0):
            values = generator.random(200) * 10
            expected, _ = brute_force_relax(values, penalty)
            actual, argmin = trace._relax(values, penalty)
            np.testing.assert_allclose(actual, expected)
            np.testing.assert_allclose(
                values[argmin] + penalty * np.abs(argmin - np.arange(values.size)), expected
            )


class LeastCostPath(unittest.TestCase):
    def _image_with_line(self, columns):
        evidence = np.zeros((len(columns), 60))
        evidence[np.arange(len(columns)), columns] = 1.0
        return evidence

    def test_follows_a_drawn_line(self):
        columns = np.concatenate([np.full(40, 10), np.arange(10, 50), np.full(40, 49)])
        evidence = self._image_with_line(columns)
        found = trace.least_cost_path(1.0 - evidence, 0.05)
        np.testing.assert_array_equal(found, columns)

    def test_bridges_a_gap_without_wandering(self):
        columns = np.full(120, 25)
        evidence = self._image_with_line(columns)
        evidence[50:70] = 0.0
        found = trace.least_cost_path(1.0 - evidence, 0.05)
        np.testing.assert_array_equal(found, columns)

    def test_prefers_faint_ink_to_a_neutral_column(self):
        rows, faint, neutral = 400, 0.4, 20
        cost = np.ones((rows, 60))
        cost[:, 40] = 1.0 - faint
        cost[:, neutral] = 1.0
        found = trace.least_cost_path(cost, 0.05)
        self.assertTrue(np.all(found == 40))


class CentreOnRun(unittest.TestCase):
    def test_moves_to_the_middle_of_the_stroke(self):
        ink = np.zeros((5, 40), bool)
        ink[:, 18:23] = True
        found = trace.centre_on_run(ink, np.full(5, 19))
        np.testing.assert_allclose(found, 20.0)

    def test_leaves_wide_runs_alone(self):
        ink = np.zeros((3, 60), bool)
        ink[:, 10:50] = True
        np.testing.assert_allclose(trace.centre_on_run(ink, np.full(3, 12)), 12.0)


class Gridlines(unittest.TestCase):
    def _density(self, positions, width=1100):
        density = np.zeros(width)
        for position in positions:
            density[position - 2:position + 3] = 1.0
        return density

    def test_picks_the_evenly_spaced_quintuple(self):
        density = self._density([60, 297, 535, 770, 1009, 400, 620])
        np.testing.assert_allclose(rules.prior_positions(density), [60, 297, 535, 770, 1009])

    def test_refines_as_a_group(self):
        prior = np.array([60.0, 297, 535, 770, 1009])
        density = self._density([63, 300, 538, 773, 1012])
        np.testing.assert_allclose(rules.refine(density, prior), prior + 3)

    def test_ignores_a_distractor_when_refining(self):
        prior = np.array([60.0, 297, 535, 770, 1009])
        density = self._density([60, 297, 535, 770, 1009, 776])
        np.testing.assert_allclose(rules.refine(density, prior), prior)


class Scale(unittest.TestCase):
    def setUp(self):
        self.gridlines = np.tile([60.0, 297, 535, 770, 1009], (3, 1))

    def test_anchors_sit_where_they_are_labelled(self):
        for value_of, columns in (
            (calibrate.bass_value, [60.0, 297, 535]),
            (calibrate.treble_value, [1009.0, 770, 535]),
        ):
            np.testing.assert_allclose(
                value_of(np.array(columns), self.gridlines), [0.0, 0.5, 1.0], atol=1e-12
            )

    def test_both_halves_grow_towards_the_middle(self):
        rising = calibrate.bass_value(np.array([100.0, 300.0, 500.0]), self.gridlines)
        falling = calibrate.treble_value(np.array([950.0, 750.0, 560.0]), self.gridlines)
        self.assertTrue(np.all(np.diff(rising) > 0))
        self.assertTrue(np.all(np.diff(falling) > 0))


class Pinning(unittest.TestCase):
    def test_forces_the_path_through_a_point(self):
        cost = np.ones((100, 60))
        cost[:, 10] = 0.0
        free = trace.least_cost_path(cost, 0.05)
        pinned = trace.least_cost_path(trace.pin(cost, {50: 45}), 0.05)
        self.assertTrue(np.all(free == 10))
        self.assertEqual(pinned[50], 45)
        self.assertEqual(pinned[0], 10)

    def test_no_pins_leaves_the_cost_untouched(self):
        cost = np.ones((5, 5))
        self.assertIs(trace.pin(cost, {}), cost)


class Corrections(unittest.TestCase):
    def _edits(self):
        return edits.Edits(
            anchors=(edits.Anchor("bass", 1000, 1750.0), edits.Anchor("treble", 1000, 2500.0)),
            strokes=(edits.Stroke("bass", ((2000, 1700.0), (2100, 1800.0))),),
            druid="test",
        )

    def test_round_trips_through_json(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "edits.json"
            self._edits().save(path)
            self.assertEqual(edits.Edits.load(path), self._edits())

    def test_missing_file_is_no_edits(self):
        self.assertTrue(edits.Edits.load(Path("/nowhere/edits.json")).is_empty())

    def test_pins_are_relative_to_chunk_and_band(self):
        pins = self._edits().pins("bass", range(900, 1100), offset=1611.0)
        self.assertEqual(pins, {100: 139})
        self.assertEqual(self._edits().pins("bass", range(0, 100), offset=1611.0), {})

    def test_strokes_replace_and_mark(self):
        rows = np.arange(1990, 2110)
        path = np.zeros(len(rows))
        source = np.full(len(rows), edits.TRACED, dtype="<U8")
        edits.apply_strokes(self._edits(), "bass", rows, path, source, offset=1611.0)
        self.assertEqual(source[0], edits.TRACED)
        self.assertEqual(source[rows == 2050][0], edits.DRAWN)
        self.assertAlmostEqual(path[rows == 2050][0], 1750.0 - 1611.0)
        self.assertEqual(source[-1], edits.TRACED)

    def test_touched_ranges_merge(self):
        many = edits.Edits(anchors=(edits.Anchor("bass", 10, 0.0), edits.Anchor("bass", 11, 0.0)))
        self.assertEqual(many.touched("bass"), [(10, 12)])

    def test_rejects_an_unknown_half(self):
        with self.assertRaises(edits.EditError):
            edits.Anchor("middle", 0, 0.0)


class Separation(unittest.TestCase):
    def test_splits_paper_ink_and_holes(self):
        rgb = np.zeros((10, 30, 3), np.uint8)
        rgb[:, :] = (130, 70, 70)
        rgb[:, 5:8] = (20, 18, 16)
        rgb[:, 20:24] = (250, 250, 250)
        layers = segment.separate(rgb, block_rows=10)
        self.assertTrue(layers.ink[:, 5:8].all())
        self.assertTrue(layers.hole[:, 20:24].all())
        self.assertFalse(layers.ink[:, 20:24].any())
        self.assertFalse(layers.ink[:, 12:16].any())


if __name__ == "__main__":
    unittest.main()
