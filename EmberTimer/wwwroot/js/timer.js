(function () {
    "use strict";

    const STORAGE_KEY = "embertimer.v1";
    const DEFAULTS = Object.freeze({ dayHours: 9, dayBasis: "elapsed", focusMinutes: 30, breakMinutes: 5, soundEnabled: true });
    const $ = id => document.getElementById(id);
    const ui = {
        todayDate: $("todayDate"), sessionIndicator: $("sessionIndicator"),
        modeLabel: $("modeLabel"), modeDot: $("modeDot"), timerDisplay: $("timerDisplay"),
        timerSubtitle: $("timerSubtitle"), sessionProgress: $("sessionProgress"),
        startPauseButton: $("startPauseButton"), startIcon: $("startIcon"),
        startLabel: $("startLabel"), resetButton: $("resetButton"), skipButton: $("skipButton"),
        paperBody: $("paperBody"), paperShine: $("paperShine"), paperShadow: $("paperShadow"),
        burningEnd: $("burningEnd"), ashEdge: $("ashEdge"), emberLine: $("emberLine"),
        emberHalo: $("emberHalo"), emberCore: $("emberCore"), smokePlume: $("smokePlume"),
        cigaretteVisual: $("cigaretteVisual"),
        dayProgressBar: $("dayProgressBar"), dayProgressPercent: $("dayProgressPercent"),
        dayProgressLabel: $("dayProgressLabel"), scheduleList: $("scheduleList"),
        scheduleCount: $("scheduleCount"), dayHours: $("dayHours"), dayBasis: $("dayBasis"),
        focusMinutes: $("focusMinutes"), breakMinutes: $("breakMinutes"),
        planForm: $("planForm"), formHint: $("formHint"),
        focusBlocks: $("focusBlocks"), restBlocks: $("restBlocks"), finishBy: $("finishBy"),
        restartDayButton: $("restartDayButton"), soundToggle: $("soundToggle"),
        testSoundButton: $("testSoundButton")
    };

    const today = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "long", day: "numeric" });
    const clockFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
    ui.todayDate.textContent = today.format(new Date());

    function readSaved() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
        catch { return null; }
    }

    const saved = readSaved();
    let config = sanitizeSettings(saved && saved.config);
    let schedule = EmberPlanner.buildPlan(config);
    let phaseIndex = Number.isInteger(saved?.phaseIndex) ? Math.max(0, Math.min(saved.phaseIndex, schedule.phases.length)) : 0;
    let remainingMs = Number.isFinite(saved?.remainingMs) ? saved.remainingMs : durationAt(phaseIndex);
    let running = Boolean(saved?.running && phaseIndex < schedule.phases.length && Number.isFinite(saved?.deadlineMs));
    let deadlineMs = running ? saved.deadlineMs : null;
    let started = Boolean(saved?.started);
    let audioContext = null;

    if (phaseIndex < schedule.phases.length) {
        remainingMs = Math.max(0, Math.min(remainingMs, durationAt(phaseIndex)));
    } else {
        remainingMs = 0;
        running = false;
    }

    function sanitizeSettings(raw) {
        const candidate = { ...DEFAULTS, ...(raw && typeof raw === "object" ? raw : {}) };
        try {
            EmberPlanner.buildPlan(candidate);
            candidate.soundEnabled = candidate.soundEnabled !== false;
            return candidate;
        } catch { return { ...DEFAULTS }; }
    }

    function durationAt(index) {
        return (schedule.phases[index]?.seconds || 0) * 1000;
    }

    function current() { return schedule.phases[phaseIndex] || null; }
    function complete() { return phaseIndex >= schedule.phases.length; }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                config, phaseIndex, remainingMs, deadlineMs, running, started
            }));
        } catch { /* localStorage may be disabled; the timer still works. */ }
    }

    function makeAudioContext() {
        if (!audioContext) {
            const AudioContextType = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextType) return null;
            try { audioContext = new AudioContextType(); } catch { return null; }
        }
        return audioContext;
    }

    function primeAudio() {
        const context = makeAudioContext();
        if (context && context.state !== "running") {
            context.resume().catch(() => {});
        }
    }

    async function playChime() {
        if (!config.soundEnabled) return;
        const context = makeAudioContext();
        if (!context) return;
        try {
            if (context.state !== "running") await context.resume();
            const start = context.currentTime;
            [
                { tone: 523.25, delay: 0.00 },
                { tone: 659.25, delay: 0.16 },
                { tone: 783.99, delay: 0.32 }
            ].forEach(({ tone, delay }) => {
                const time = start + delay;
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(tone, time);
                gain.gain.setValueAtTime(0.0001, time);
                gain.gain.exponentialRampToValueAtTime(0.11, time + 0.035);
                gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.75);
                oscillator.connect(gain).connect(context.destination);
                oscillator.start(time);
                oscillator.stop(time + 0.8);
            });
        } catch { /* Audio playback can be restricted until the user clicks. */ }
    }

    function syncClock() {
        if (!running || complete()) return;
        const now = Date.now();
        const diff = deadlineMs - now;
        if (diff > 0) {
            remainingMs = diff;
            renderClock();
            return;
        }

        // Catch up through MULTIPLE phases when a laptop sleeps or a tab is throttled.
        let overdue = -diff;
        let crossedBoundary = false;
        while (true) {
            phaseIndex += 1;
            crossedBoundary = true;
            if (complete()) {
                running = false;
                deadlineMs = null;
                remainingMs = 0;
                break;
            }
            const nextDuration = durationAt(phaseIndex);
            if (overdue < nextDuration) {
                remainingMs = nextDuration - overdue;
                deadlineMs = now + remainingMs;
                break;
            }
            overdue -= nextDuration;
        }
        if (crossedBoundary) {
            // One chime per catch-up, rather than a pile of overlapping alarms.
            void playChime();
            renderStatic();
            save();
        }
        renderClock();
    }

    function formatTime(ms) {
        const seconds = Math.max(0, Math.ceil(ms / 1000));
        return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    }

    function totalRemainingMs() {
        if (complete()) return 0;
        return remainingMs + schedule.phases.slice(phaseIndex + 1)
            .reduce((sum, phase) => sum + phase.seconds * 1000, 0);
    }

    function renderCigarette(progress) {
        const width = 409 * progress;
        const endX = 217 + width;
        [ui.paperBody, ui.paperShine, ui.paperShadow].forEach(element => element.setAttribute("width", width.toFixed(3)));
        ui.ashEdge.setAttribute("x", (endX - 13).toFixed(3));
        ui.emberLine.setAttribute("x1", endX.toFixed(3));
        ui.emberLine.setAttribute("x2", endX.toFixed(3));
        ui.emberHalo.setAttribute("cx", endX.toFixed(3));
        ui.emberCore.setAttribute("cx", endX.toFixed(3));
        ui.smokePlume.setAttribute("transform", `translate(${(endX - 626).toFixed(3)} 0)`);
        ui.burningEnd.style.opacity = progress > 0.001 ? "1" : "0";
        ui.smokePlume.style.opacity = progress > 0.001 && running ? "1" : "0.35";
        ui.cigaretteVisual.setAttribute("aria-label", `${Math.round(progress * 100)} percent of the cigarette is left`);
    }

    function renderClock() {
        const active = current();
        const duration = durationAt(phaseIndex);
        const progress = active && duration > 0 ? Math.min(1, Math.max(0, remainingMs / duration)) : 0;
        ui.timerDisplay.textContent = formatTime(remainingMs);
        ui.sessionProgress.style.width = `${((1 - progress) * 100).toFixed(3)}%`;
        renderCigarette(progress);

        const elapsed = schedule.phases.slice(0, phaseIndex).reduce((sum, phase) => sum + phase.seconds * 1000, 0)
            + (active ? Math.max(0, duration - remainingMs) : 0);
        const percent = schedule.totalSeconds ? Math.min(100, elapsed / (schedule.totalSeconds * 1000) * 100) : 100;
        ui.dayProgressBar.style.width = `${percent.toFixed(3)}%`;
        ui.dayProgressPercent.textContent = `${Math.floor(percent)}%`;
        ui.dayProgressLabel.textContent = complete() ? "Your day is complete" : running ? "Your day is in motion" : started ? "Paused, whenever you're ready" : "Your day is ready";
        ui.finishBy.textContent = complete() ? "All done" : running ? clockFormat.format(new Date(Date.now() + totalRemainingMs())) : started ? "When resumed" : "When you start";
    }

    function renderTimeline() {
        const list = document.createDocumentFragment();
        schedule.phases.forEach((phase, index) => {
            const item = document.createElement("div");
            const status = index < phaseIndex ? "done" : index === phaseIndex ? "current" : "upcoming";
            item.className = `timeline-item ${phase.kind} ${status}`;
            if (status === "current") item.setAttribute("aria-current", "step");

            const symbol = document.createElement("span");
            symbol.className = "timeline-symbol";
            symbol.textContent = phase.kind === "focus" ? "✧" : "☕";

            const info = document.createElement("div");
            info.className = "timeline-info";
            const title = document.createElement("strong");
            title.textContent = phase.kind === "focus" ? `Focus session ${String(phase.number).padStart(2, "0")}` : `A little break ${String(phase.number).padStart(2, "0")}`;
            const description = document.createElement("span");
            description.textContent = phase.kind === "focus" ? "Settle into what matters" : "Step away and reset";
            info.append(title, description);

            const duration = document.createElement("span");
            duration.className = "timeline-duration";
            duration.textContent = `${phase.seconds / 60} min`;
            item.append(symbol, info, duration);
            list.append(item);
        });
        ui.scheduleList.replaceChildren(list);
        const activeItem = ui.scheduleList.querySelector(".timeline-item.current");
        if (activeItem) ui.scheduleList.scrollTop = Math.max(0, activeItem.offsetTop - ui.scheduleList.offsetTop - 50);
    }

    function renderStatic() {
        const active = current();
        const isBreak = active?.kind === "break";
        document.body.classList.toggle("break-mode", Boolean(isBreak));
        ui.sessionIndicator.textContent = complete() ? "ALL SESSIONS COMPLETE" :
            `${isBreak ? "BREAK" : "SESSION"} ${String(active.number).padStart(2, "0")} / ${isBreak ? schedule.breakCount : schedule.focusCount}`;
        ui.modeLabel.textContent = complete() ? "DAY COMPLETE" : isBreak ? "BREAK TIME" : "FOCUS TIME";
        ui.modeDot.classList.toggle("break-dot", Boolean(isBreak));
        ui.timerSubtitle.textContent = complete() ? "You showed up for yourself today." :
            running && isBreak ? "Put the kettle on. You've earned this." :
            running ? "Just one thing, just for now." :
            isBreak ? "Five quiet minutes are yours." :
            started ? "Your work will be here when you're ready." : "A moment to settle in.";

        ui.startPauseButton.disabled = false;
        ui.startLabel.textContent = complete() ? "Begin a new day" : running ? "Pause timer" :
            isBreak ? "Start your break" : started ? "Resume focus" : "Start focusing";
        ui.startIcon.textContent = running ? "Ⅱ" : "▶";
        ui.resetButton.disabled = complete();
        ui.skipButton.disabled = complete();
        ui.focusBlocks.textContent = String(schedule.focusCount);
        ui.restBlocks.textContent = String(schedule.breakCount);
        ui.scheduleCount.textContent = `${schedule.focusCount} focus blocks`;
        ui.soundToggle.checked = config.soundEnabled;
        renderTimeline();
    }

    function renderForm() {
        ui.dayHours.value = String(config.dayHours);
        ui.dayBasis.value = config.dayBasis;
        ui.focusMinutes.value = String(config.focusMinutes);
        ui.breakMinutes.value = String(config.breakMinutes);
        ui.soundToggle.checked = config.soundEnabled;
    }

    function restart(newConfig = config) {
        config = newConfig;
        schedule = EmberPlanner.buildPlan(config);
        phaseIndex = 0;
        remainingMs = durationAt(0);
        deadlineMs = null;
        running = false;
        started = false;
        renderForm();
        renderStatic();
        renderClock();
        save();
    }

    function startOrPause() {
        syncClock();
        if (complete()) {
            restart();
        }
        if (running) {
            remainingMs = Math.max(0, deadlineMs - Date.now());
            running = false;
            deadlineMs = null;
        } else {
            primeAudio(); // starting via a click unlocks browser audio in most browsers
            running = true;
            started = true;
            deadlineMs = Date.now() + remainingMs;
        }
        save();
        renderStatic();
        renderClock();
    }

    function skipPhase() {
        syncClock();
        if (complete()) return;
        phaseIndex += 1;
        if (complete()) {
            running = false;
            remainingMs = 0;
            deadlineMs = null;
        } else {
            remainingMs = durationAt(phaseIndex);
            deadlineMs = running ? Date.now() + remainingMs : null;
        }
        save();
        renderStatic();
        renderClock();
    }

    ui.startPauseButton.addEventListener("click", startOrPause);
    ui.resetButton.addEventListener("click", () => {
        if (complete()) return;
        running = false;
        deadlineMs = null;
        remainingMs = durationAt(phaseIndex);
        started = false;
        save();
        renderStatic();
        renderClock();
    });
    ui.skipButton.addEventListener("click", skipPhase);
    ui.restartDayButton.addEventListener("click", () => {
        if ((started || phaseIndex > 0) && !window.confirm("Start a fresh day? Your current timer progress will reset.")) return;
        restart();
    });
    ui.planForm.addEventListener("submit", event => {
        event.preventDefault();
        const proposed = {
            dayHours: Number(ui.dayHours.value), dayBasis: ui.dayBasis.value,
            focusMinutes: Number(ui.focusMinutes.value), breakMinutes: Number(ui.breakMinutes.value),
            soundEnabled: config.soundEnabled
        };
        try {
            EmberPlanner.buildPlan(proposed);
            if ((started || phaseIndex > 0) && !window.confirm("Update the plan and start a fresh day? Current progress will reset.")) return;
            restart(proposed);
            ui.formHint.textContent = "Your new rhythm is ready.";
        } catch (error) { ui.formHint.textContent = error.message; }
    });
    ui.soundToggle.addEventListener("change", () => {
        config.soundEnabled = ui.soundToggle.checked;
        if (config.soundEnabled) primeAudio();
        save();
    });
    ui.testSoundButton.addEventListener("click", () => {
        const before = config.soundEnabled;
        config.soundEnabled = true;
        void playChime().finally(() => { config.soundEnabled = before; });
    });
    window.addEventListener("focus", syncClock);
    document.addEventListener("visibilitychange", syncClock);
    window.setInterval(syncClock, 250);

    renderForm();
    syncClock();
    renderStatic();
    renderClock();
})();
