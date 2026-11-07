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

## Connect YouTube Music (Chrome, Edge, Brave)

YouTube's public APIs do **not** expose the song that is currently playing in a user's YouTube Music tab. A normal MVC website also **cannot read a different website's tab**. The included optional browser companion is the local solution.

1. Start Ember at `http://localhost:5074/`.
2. In Chrome or Edge, open `chrome://extensions` (Edge: `edge://extensions`), enable **Developer mode**, and click **Load unpacked**.
3. Choose the **`YouTubeMusicBridge`** directory found beside the MVC app. (Select the folder itself, not the ZIP or the manifest file.)
4. On Ember, expand **Connect your YouTube Music** in the music card and click **Copy** to copy the pairing code.
5. Click the Ember companion icon in your browser's extension list, paste the pairing code and click **Pair with Ember**. The popup should say **Paired!**.
6. Open or refresh `https://music.youtube.com/` in the **same browser**, and play a track. Within a few seconds the track details appear on Ember.

**After restarting Ember**, its token changes. Repeat steps 4–5. This is intentional for a small local-only prototype. YouTube Music may change its HTML and require an update to `YouTubeMusicBridge/content.js` selectors. This works with YouTube Music **in the browser**, not music playing in a separate desktop/mobile application.

### Music bridge design & security

- The extension runs only on `https://music.youtube.com/` and reads song title, artist, artwork URL, playback state and a track URL (when available).
- The extension background service worker POSTs this information to `http://localhost:5074/api/music/now-playing`, including a random **40-character pairing token** from the MVC app.
- The server verifies the token and stores the latest metadata **in RAM only**. It forgets the track 18 seconds after the extension stops reporting. It does not collect cookies, audio, passwords or OAuth credentials.
- The MVC app fetches `GET /api/music/now-playing` on the same origin every 4 seconds to update the UI.
- The extension needs no access to browsing history or Google account information.
- **Keep Ember on localhost only.** The starter is not designed for public deployment or multiple users; add proper authentication, HTTPS and a persistent per-user token before hosting it publicly.

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
| `EmberTimer/wwwroot/js/music.js` | Music card polling and pairing code copy |
| `EmberTimer/Services/MusicBridge.cs` | Local metadata receiver and pairing key |
| `EmberTimer/Controllers/MusicController.cs` | Music GET/POST endpoints |
| `YouTubeMusicBridge/content.js` | Reads track data from the YouTube Music tab |

## Quick planner tests

If Node.js is installed, run this from the folder that contains `README.md`:

```bash
node tests/planner.test.js
```

This starter was authored without a .NET build environment; run Visual Studio's build to verify compilation on your machine. The JavaScript files were syntax-checked with Node.js, and the planner has tests for the requested 9-hour cases.
