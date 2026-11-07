const assert = require("node:assert/strict");
const { buildPlan } = require("../EmberTimer/wwwroot/js/planner.js");

function checkPlan({ dayHours, dayBasis, focusMinutes = 30, breakMinutes = 5 }, expected) {
    const result = buildPlan({ dayHours, dayBasis, focusMinutes, breakMinutes });
    assert.equal(result.focusCount, expected.focusCount);
    assert.equal(result.breakCount, expected.breakCount);
    assert.equal(result.totalSeconds, expected.totalMinutes * 60);
    assert.equal(result.focusSeconds, expected.focusMinutes * 60);
    assert.equal(result.breakSeconds, expected.breakMinutes * 60);
    assert.equal(result.phases[0].kind, "focus");
    assert.equal(result.phases.at(-1).kind, "focus");
}

checkPlan({ dayHours: 9, dayBasis: "elapsed" }, {
    focusCount: 16, breakCount: 15, totalMinutes: 540, focusMinutes: 465, breakMinutes: 75
});
checkPlan({ dayHours: 9, dayBasis: "focus" }, {
    focusCount: 18, breakCount: 17, totalMinutes: 625, focusMinutes: 540, breakMinutes: 85
});
checkPlan({ dayHours: 0.5, dayBasis: "elapsed" }, {
    focusCount: 1, breakCount: 0, totalMinutes: 30, focusMinutes: 30, breakMinutes: 0
});
checkPlan({ dayHours: 1, dayBasis: "elapsed" }, {
    focusCount: 2, breakCount: 1, totalMinutes: 60, focusMinutes: 55, breakMinutes: 5
});
checkPlan({ dayHours: 1, dayBasis: "focus" }, {
    focusCount: 2, breakCount: 1, totalMinutes: 65, focusMinutes: 60, breakMinutes: 5
});
assert.throws(() => buildPlan({ dayHours: -1, dayBasis: "elapsed", focusMinutes: 30, breakMinutes: 5 }));
assert.throws(() => buildPlan({ dayHours: 9, dayBasis: "something", focusMinutes: 30, breakMinutes: 5 }));
console.log("Planner tests passed: 9h elapsed, 9h focus, edge cases and invalid inputs.");
