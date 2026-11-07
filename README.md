# Ember — Cozy Workday Timer

An ASP.NET Core MVC (.NET 10) focus timer built for Visual Studio 2026. The cigarette burns down to match the **remaining time** in each phase. The optional YouTube Music browser companion shows the current track while YouTube Music is playing in the same Chromium browser.

## Getting started in Visual Studio 2026

1. Install the **ASP.NET and web development** workload and the .NET 10 SDK in Visual Studio 2026.
2. Extract this ZIP, open `EmberTimer.sln` in Visual Studio (or open the `EmberTimer/EmberTimer.csproj` project).
3. Select the **EmberTimer (local HTTP)** launch profile. It is important to use port **5074**: the optional music extension sends its metadata to that port.
4. Press **F5** (or Ctrl+F5). The dashboard opens at `http://localhost:5074/`.
5. Select workday length (default 9 hours), choose whether this includes breaks, and hit **Start focusing**.

You can also run the app with the .NET 10 SDK:

```powershell
cd EmberTimer
dotnet run --launch-profile "EmberTimer (local HTTP)"
```

No NuGet add-on packages, Google API key, account login, external font, or database is required.

## Timer behaviour

| Workday setting | Focus sessions | Breaks | Elapsed duration |
| --- | ---: | ---: | ---: |
| 9h including breaks | 16 (last is 15m) | 15 × 5m | 9h |
| 9h productive focus | 18 × 30m | 17 × 5m | 10h 25m |

- By default, session length is **30m** and break length is **5m**, but you can change both.
- **Start / pause** controls the whole schedule; after a phase ends, the next phase begins automatically, with a soft three-note chime.
- **Reset** restarts the current phase and pauses; **Skip** moves forward to the next phase; **Start a fresh day** resets everything to the beginning.
- Changes to schedule settings begin a new day and reset progress.
- Timer progress and preferences are saved in `localStorage`. The countdown uses real `Date.now()` deadlines, so returning from another tab or sleep catches up accurately.
- Chimes are synthesized via Web Audio. A user click is needed to unlock audio in browsers; leaving the page completely closed means the page cannot play its chime. Background throttling/sleep can cause chimes to be delayed until the app becomes active again.
- A cigarette is only a **visual metaphor** for passing time; no real tobacco or smoke is involved.

## Files worth exploring

| File | Role |
| --- | --- |
| `EmberTimer/Views/Home/Index.cshtml` | Dashboard markup and SVG cigarette |
| `EmberTimer/wwwroot/css/site.css` | Cozy dark styling and smoke animation |
| `EmberTimer/wwwroot/js/planner.js` | Work/break schedule builder |
| `EmberTimer/wwwroot/js/timer.js` | Timer state, progress rendering, chimes, persistence |

## Quick planner tests

If Node.js is installed, run this from the folder that contains `README.md`:

```bash
node tests/planner.test.js
```

This starter was authored without a .NET build environment; run Visual Studio's build to verify compilation on your machine. The JavaScript files were syntax-checked with Node.js, and the planner has tests for the requested 9-hour cases.
