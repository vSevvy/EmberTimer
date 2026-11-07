
// Creates focus and break phases from workday settings.
(function (root) {
    "use strict";

    function buildPlan(config) {
        const hours = Number(config.dayHours);
        const focus = Number(config.focusMinutes);
        const rest = Number(config.breakMinutes);
        const basis = config.dayBasis;

        if (!Number.isFinite(hours) || hours < 0.5 || hours > 16 ||
            !Number.isInteger(focus) || focus < 5 || focus > 120 ||
            !Number.isInteger(rest) || rest < 1 || rest > 60 ||
            (basis !== "elapsed" && basis !== "focus")) {
            throw new Error("Enter a valid day length, focus duration and break duration.");
        }

        const phases = [];
        const dayMinutes = Math.round(hours * 60);
        let remainingMinutes = dayMinutes;
        let focusCount = 0;
        let breakCount = 0;

        while (remainingMinutes > 0) {
            const workMinutes = Math.min(focus, remainingMinutes);
            focusCount += 1;
            phases.push({
                kind: "focus",
                number: focusCount,
                seconds: workMinutes * 60,
                label: `Focus ${String(focusCount).padStart(2, "0")}`
            });
            remainingMinutes -= workMinutes;
            if (remainingMinutes === 0) break;

            // Count breaks towards the day length only in elapsed-time mode.
            const restMinutes = basis === "focus" ? rest : Math.min(rest, remainingMinutes);
            breakCount += 1;
            phases.push({
                kind: "break",
                number: breakCount,
                seconds: restMinutes * 60,
                label: `Break ${String(breakCount).padStart(2, "0")}`
            });
            if (basis === "elapsed") remainingMinutes -= restMinutes;
        }

        const totalSeconds = phases.reduce((total, phase) => total + phase.seconds, 0);
        const focusSeconds = phases.filter(phase => phase.kind === "focus")
            .reduce((total, phase) => total + phase.seconds, 0);
        const breakSeconds = totalSeconds - focusSeconds;

        return { phases, totalSeconds, focusSeconds, breakSeconds, focusCount, breakCount };
    }

    const planner = { buildPlan };
    root.EmberPlanner = planner;
    if (typeof module !== "undefined" && module.exports) module.exports = planner;
})(typeof window !== "undefined" ? window : globalThis);
