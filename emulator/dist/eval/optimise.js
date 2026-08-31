/**
 * Gradient-free fitting.
 *
 * The models have hard barriers and switching valves in them, so the objective
 * is not smooth and derivatives are no use. Differential evolution finds the
 * basin, a Nelder–Mead polish settles into it.
 */
function mulberry32(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function inBounds(vector, bounds) {
    return vector.map((value, index) => Math.min(Math.max(value, bounds.lower[index]), bounds.upper[index]));
}
/** Latin hypercube, so the initial population covers each axis evenly. */
function latinHypercube(count, bounds, random) {
    const dimensions = bounds.lower.length;
    const columns = Array.from({ length: dimensions }, (_, axis) => {
        const strata = Array.from({ length: count }, (_, index) => (index + random()) / count);
        return strata
            .map((value) => ({ value, order: random() }))
            .sort((a, b) => a.order - b.order)
            .map(({ value }) => bounds.lower[axis] + value * (bounds.upper[axis] - bounds.lower[axis]));
    });
    return Array.from({ length: count }, (_, member) => columns.map((column) => column[member]));
}
export function differentialEvolution(objective, bounds, options = {}) {
    const dimensions = bounds.lower.length;
    const size = options.populationSize ?? Math.max(20, 4 * dimensions);
    const generations = options.generations ?? 200;
    const random = mulberry32(options.seed ?? 1);
    const start = latinHypercube(size, bounds, random);
    (options.seeds ?? []).forEach((seed, index) => {
        if (index < size)
            start[index] = inBounds(seed, bounds);
    });
    let population = start;
    let values = population.map(objective);
    let evaluations = values.length;
    const pickOther = (exclude) => {
        const draw = Math.floor(random() * (size - 1));
        return draw >= exclude ? draw + 1 : draw;
    };
    const challenge = (member) => {
        const [a, b, c] = [pickOther(member), pickOther(member), pickOther(member)];
        const weight = 0.5 + 0.3 * random();
        const crossover = 0.9;
        const forced = Math.floor(random() * dimensions);
        const mutant = population[a].map((value, axis) => value + weight * (population[b][axis] - population[c][axis]));
        const trial = inBounds(population[member].map((value, axis) => axis === forced || random() < crossover ? mutant[axis] : value), bounds);
        evaluations += 1;
        return { vector: trial, value: objective(trial) };
    };
    const bestOf = () => {
        const index = values.reduce((best, value, at) => (value < values[best] ? at : best), 0);
        return { vector: population[index], value: values[index], evaluations };
    };
    Array.from({ length: generations }).forEach((_, generation) => {
        const trials = population.map((_, member) => challenge(member));
        const kept = trials.map((trial, member) => trial.value <= values[member] ? trial : { vector: population[member], value: values[member] });
        population = kept.map(({ vector }) => vector);
        values = kept.map(({ value }) => value);
        options.onGeneration?.(generation, bestOf());
    });
    return bestOf();
}
export function nelderMead(objective, start, bounds, options = {}) {
    const dimensions = start.length;
    const steps = options.steps ?? bounds.lower.map((low, axis) => 0.05 * (bounds.upper[axis] - low));
    const iterations = options.iterations ?? 400 * dimensions;
    const tolerance = options.tolerance ?? 1e-9;
    let evaluations = 0;
    const score = (vector) => {
        evaluations += 1;
        return objective(inBounds(vector, bounds));
    };
    let simplex = [inBounds(start, bounds), ...steps.map((step, axis) => inBounds(start.map((value, at) => (at === axis ? value + step : value)), bounds))].map((vector) => ({ vector, value: score(vector) }));
    const order = () => {
        simplex.sort((a, b) => a.value - b.value);
    };
    order();
    const step = () => {
        const best = simplex[0];
        const worst = simplex[dimensions];
        const secondWorst = simplex[dimensions - 1];
        const centroid = Array.from({ length: dimensions }, (_, axis) => simplex.slice(0, dimensions).reduce((total, point) => total + point.vector[axis], 0) / dimensions);
        const along = (factor) => centroid.map((value, axis) => value + factor * (value - worst.vector[axis]));
        const reflected = { vector: inBounds(along(1), bounds), value: 0 };
        reflected.value = score(reflected.vector);
        if (reflected.value < best.value) {
            const expanded = { vector: inBounds(along(2), bounds), value: 0 };
            expanded.value = score(expanded.vector);
            simplex[dimensions] = expanded.value < reflected.value ? expanded : reflected;
        }
        else if (reflected.value < secondWorst.value) {
            simplex[dimensions] = reflected;
        }
        else {
            const contracted = { vector: inBounds(along(reflected.value < worst.value ? 0.5 : -0.5), bounds), value: 0 };
            contracted.value = score(contracted.vector);
            if (contracted.value < Math.min(worst.value, reflected.value)) {
                simplex[dimensions] = contracted;
            }
            else {
                simplex = simplex.map((point, index) => {
                    if (index === 0)
                        return point;
                    const shrunk = inBounds(point.vector.map((value, axis) => best.vector[axis] + 0.5 * (value - best.vector[axis])), bounds);
                    return { vector: shrunk, value: score(shrunk) };
                });
            }
        }
        order();
    };
    Array.from({ length: iterations }).every(() => {
        if (Math.abs(simplex[dimensions].value - simplex[0].value) <= tolerance)
            return false;
        step();
        return true;
    });
    return { vector: simplex[0].vector, value: simplex[0].value, evaluations };
}
