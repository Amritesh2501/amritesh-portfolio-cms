# THE AMRITESH FILES

**Build brief — v2**

> You don't browse this portfolio. You investigate it.

---

## 0. WHAT CHANGED IN THIS VERSION, AND WHY

Four fixes to the original idea. Everything else is the same shape.

**The premise is now a disappearance, not a crime.** "Crime scene" raises a question the portfolio can never answer — what did he do? It also drags the art toward blood and body outlines, which is the wrong genre and kills the ending. The subject has *gone*. Six rooms are still exactly as he left them. You are here to establish who he was from what he left behind. Same rooms, same evidence, same tone, no corpse, and now the ending lands.

**Not every piece of evidence is a mini-game.** Six rooms × eight pieces means forty-eight puzzles. Nobody finishes that. Roughly half of each room's evidence is a *find* — click, read, log it. The other half is guarded. The guarded ones are the ones that deserve it: the locked drawer, the running machine, the sealed folder.

**Every room's mini-games are its own.** No room reuses another room's puzzle. The lab does not ask for the lockpick the house already asked for. This is the single biggest thing separating "a game" from "a website with a puzzle widget in it."

**The ending has a twist.** You are told you are reconstructing a case. What you are actually assembling is a CV. The final beat should make the visitor re-read the last hour.

---

## 1. THE PREMISE

The subject of the file is **AMRITESH TIWARI**.

He is not missing in any tragic sense — that is never stated and never implied. He has simply *left*, and an archive has been opened on him. The framing is a **background investigation**: someone wants to know exactly who this person is, and the only way to find out is to go through his rooms.

The visitor is the investigator. They are never named, never given a face, never given dialogue.

The dramatic question, held for the whole experience, is:

> *Who is this person, and why is there a file on him at all?*

The answer, delivered at 100%:

> *There was no case. This is his portfolio. You just earned it.*

**Tone:** grounded, quiet, late at night, slightly melancholy. Closer to a procedural drama than a horror game. No jump scares. No gore. No sirens. No neon. No "hacker" aesthetics.

---

## 2. THE SPINE

```
WARNING (typewriter)
  → OPEN CONFIDENTIAL
    → BLACK
      → THE INVESTIGATION ROOM  ←──────────────┐
        → THE SHELF                            │
          → PICK A BINDER                      │
            → PAGE-TURN TRANSITION             │
              → A ROOM                         │
                → FIND EVIDENCE                │
                  → MINI-GAME                  │
                    → EVIDENCE RECOVERED       │
                → CASE SECTION SOLVED ─────────┘
                       (six times)
  → ALL EVIDENCE RECOVERED
    → CASE SOLVED
      → EXPLORE PORTFOLIO
        → THE FINAL REPORT
```

The investigation room is the hub and the only hub. Every case starts and ends there. Returning to it should feel like coming back to your desk, not like a menu.

---

## 3. OPENING

### 3.1 The boot

Pure black. No navigation, no logo, no cursor. Text types itself, character by character, at a speed a person can read along with:

```
INITIALIZING SECURE ENVIRONMENT...
ESTABLISHING CONNECTION...
VERIFYING ACCESS...
ACCESS LEVEL: RESTRICTED
LOADING CONFIDENTIAL ARCHIVE...
```

Hold. Then the warning types out:

> **WARNING**
>
> You are about to access confidential information regarding the subject known as:
>
> **AMRITESH TIWARI**
>
> This archive contains personal records, professional history, projects, educational records, skills, certifications and other information belonging to the subject.
>
> Several records have been fragmented.
> Some evidence has been hidden.
> Some information can only be recovered through investigation.
>
> Proceed only if you are prepared to investigate the entire case.

Do not reveal it all at once. The waiting is the point — it is the only moment in the experience where nothing is asked of the visitor, and it sets the pace for everything after.

### 3.2 The authorization

Then, and only then:

> **OPEN CONFIDENTIAL**
> `● ACCESS REQUIRED`

Make this read as a physical authorization plate — a status lamp, a hard edge, a machine granting permission. Not a web button. Give it one small piece of life: a slow pulse on the lamp.

A second, quieter way out: **LEAVE THE ARCHIVE.** Anyone who does not want to play a game should not be trapped in one.

### 3.3 The cut

On click:

1. Everything fades to black. All interface elements leave.
2. **Hold on black for a full beat.** Do not rush this.
3. Room tone arrives *before* the picture — a clock, a fan, a distant street.
4. The room fades up from a tight, dark detail, not from a wide shot.

The visitor should feel they have walked into somewhere, not loaded something.

---

## 4. THE INVESTIGATION ROOM (the hub)

A real detective's office, late, one lamp on. Not a command centre. Not futuristic.

**Contents, laid out left to right:**

| Zone | What is there |
|---|---|
| Far left | Whiteboard: `ACTIVE CASES`, AMR-001 through AMR-006, in his handwriting |
| Left | Filing cabinets, stacked cardboard EVIDENCE boxes, a dying plant |
| Centre-left | Department shield, `TO PROTECT / TO SERVE` plaque |
| **Centre** | **The shelf. Six binders. This is the navigation.** |
| Centre-right | Flag, framed certificates hung slightly crooked |
| Right | Window, venetian blinds, city still awake outside |
| Far right | Corkboard: photographs, a map, pinned notes, red string |
| Foreground | The desk — monitors, keyboard, phone, lamp, cold coffee, nameplate |

### 4.1 The camera

Scrolling moves the camera through the room. Not a page scrolling — a camera moving.

- Foreground objects travel further and faster than background ones.
- The room has a genuine front, middle and back, and moving proves it.
- The camera settles at composed viewpoints rather than drifting freely. A free camera in a room this dark means visitors who never find anything.
- Moving the pointer leans the shot very slightly, as if the investigator shifted their weight. Small. It is a lean, not a second camera.
- Every camera move eases. Nothing snaps.

**Viewpoints in this room:** the case whiteboard · the evidence boxes · **the shelf** · the window · the corkboard · the desk.

### 4.2 The shelf

Six binders, standing upright, spines out. Each carries a number and a name:

```
01 ABOUT      02 EXPERIENCE   03 PROJECTS
04 EDUCATION  05 SKILLS       06 CERTIFICATES
```

They must look like objects, not cards:

- Each leans at its own slight angle. A perfectly aligned row is the fastest way to make a room look generated.
- Worn corners, scuffed spines, a label peeling on one.
- Visible thickness. Some are fatter than others.
- Reaching for one lifts it slightly out of the row.
- A binder whose case is not yet unlocked stays where it is and reads `SEALED`.

### 4.3 Selecting a binder

The camera pushes in. The binder slides out of the shelf, rotates to face the visitor, and the room behind it goes soft. The binder becomes the only thing in the world.

On its cover:

```
CONFIDENTIAL

CASE AMR-001
SUBJECT PROFILE
AMRITESH TIWARI

STATUS:     ACTIVE
EVIDENCE:   0 / 8
LOCATION:   THE SUBJECT'S RESIDENCE
```

Plus one line of synopsis, written as a case officer would write it — dry, specific, slightly weary.

Two options: **EXPLORE FILE** and **PUT IT BACK**.

### 4.4 The page turn

This transition carries more weight than any other. It has to sell *folder → document → page → world*.

1. The binder opens.
2. Pages turn, several of them, each a beat behind the last.
3. The camera moves toward the pages, not the pages toward the camera.
4. A page fills the frame.
5. The camera passes *through* the page.
6. Black.
7. The new room fades up from a tight detail.

Never a loading spinner. Never a slide. Never a fade between two web pages.

---

## 5. THE SIX ROOMS

Each room is the same machine: a layered environment, a camera that moves through it, objects that can be examined, and evidence that has to be earned.

### 01 · ABOUT — **THE SUBJECT'S RESIDENCE**

A bedroom-workspace at night. Lived in, not staged. Slightly messy in the way a real room is messy.

Bed, unmade · nightstand with a lamp and a clock reading 23:47 · a camera left on the covers · photo wall with polaroids and a pinned map · a poster that clearly means something to him · doorway to a lit hall · desk with two monitors still on · handwritten wall text · an IDEAS whiteboard with some boxes ticked · sticky notes · bookshelf · guitar · low table with an open notebook, a mug, books, a phone, keys · backpack and shoes on the floor · an armchair with a slogan throw · **a folder stamped CONFIDENTIAL in the extreme foreground, padlocked.**

**What it establishes:** who he is, what he cares about, how he works, what he is aiming at.

**Evidence (8) —** *identity · interests · work ethic · personality · goals · method · toolkit · the hidden file*

The CONFIDENTIAL folder is the payoff of the room. It stays shut until the room has been read, because its combination is written on four things in the room. It must not be the first thing anyone can click.

---

### 02 · EXPERIENCE — **THE CORPORATE OFFICE**

An empty software office at night. Motion lights off. Someone's jacket still on a chair.

Rows of developer desks · monitors on standby · a glass meeting room · whiteboards covered in architecture diagrams · a printer with abandoned output · employee badges on lanyards · a server cupboard with its door ajar · project boards with sticky columns · handover notes · a wall of team photos.

**What it establishes:** where he has worked, what he owned, what he shipped, in what order.

**Evidence (7) —** *employment record · responsibilities · the handover · the architecture he owned · a shipped result · a reference note · the timeline*

---

### 03 · PROJECTS — **THE DEVELOPER'S LAB**

The most technical room, and the most alive. Things in here are still *running*.

A wall of monitors showing live systems · a map with vehicles moving on it · a server rack with blinking status · a database console mid-query · an AI console with a cursor waiting · architecture diagrams taped over each other · a whiteboard of boxes and arrows · notebooks of design sketches · a debugging session frozen mid-step · cable spaghetti · a single desk lamp.

**What it establishes:** what he has actually built, and how each thing works.

**Evidence (9) —** one piece per real project, plus the architecture, the stack, and the thing he is proudest of.

Each project is discovered through a puzzle that *matches it*. Tracking system → trace a signal. AI platform → assemble a prompt chain. Ordering system → reconstruct an order's path. Never a generic puzzle in front of a specific project.

---

### 04 · EDUCATION — **THE COLLEGE ARCHIVES**

A records room under a university, after hours. Institutional, cold, over-lit in patches.

Rolling stacks of files · a microfiche reader still on · a computer lab visible through a window · a library reading desk with a lamp · a noticeboard of old timetables and results · card catalogue drawers · stacked exam papers · a locked records cabinet · a wall clock that stopped.

**What it establishes:** his degree, his institution, his timeline, his final-year work.

**Evidence (5) —** *the degree · the institution · the transcript · the final-year project · the timeline*

---

### 05 · SKILLS — **THE TRAINING FACILITY**

Not an office. A concrete assessment hall with six lit bays down one wall, each a different discipline.

Six numbered stations · rubber matting · equipment racks · a scoreboard · a glass observation booth · cable runs along the floor · a clipboard on a hook · overhead lights, only some of them on.

**Stations:** `DEVELOPMENT` · `AI` · `CLOUD` · `DATABASE` · `DESIGN` · `DEVOPS`

**What it establishes:** what he can actually do, demonstrated rather than claimed.

**Evidence (6) —** one per station. Clearing a station lights it and unlocks that discipline's skills.

This room is the most game-like of the six, and it should be. It is a test facility. Let it feel like one.

---

### 06 · CERTIFICATES — **THE LOCKED ARCHIVE**

The most secure room. A vault. The final layer.

A heavy door left open · numbered safe-deposit drawers floor to ceiling · a central examination table under a single light · sealed document boxes · a ledger · an index cabinet · a cage of archive shelving · dust in the beam.

**What it establishes:** his certifications, and the close of the case.

**Evidence (6) —** one per certification.

**This room is different:** nothing in it opens on its own. Each drawer needs something carried in from the other five rooms — a number seen in the office, a date from the archives, a name from the lab. It is the room that makes the whole investigation retroactively matter.

The last drawer opens the case.

---

## 6. EVIDENCE

Every piece of evidence has:

```
WHICH CASE      ABOUT
WHAT IT IS      The CONFIDENTIAL folder
HUD LABEL       Hidden File
WHERE           foreground, low, right of frame
HOW             locked — needs a combination
GUARDED BY      COMBINATION
PAYS OUT        a real, specific piece of his portfolio
NEEDS FIRST     the ideas board
```

### 6.1 Three kinds of object

Do not make everything interactive. A room where everything responds is a menu.

| Kind | Behaviour |
|---|---|
| **Set dressing** | Does nothing. Most of the room. It is there to be looked at. |
| **A find** | Click, read, logged. No puzzle. Controls pacing. |
| **Guarded evidence** | Opens a mini-game. The valuable half. |

### 6.2 Discovery

- A hoverable object gets a **subtle** indicator. A thin bracket and a small label: `EVIDENCE DETECTED`. Nothing glows. Nothing is outlined in colour.
- Some evidence is only visible **from the right viewpoint.** This is what makes a room worth moving through instead of scanning once.
- One piece per room is genuinely hidden — behind something, under something, only legible at a particular angle.

### 6.3 The payout

After a mini-game is solved:

1. A held beat. Silence.
2. **`EVIDENCE RECOVERED`**
3. The recovered document appears — typeset as a **document extract**, not a game popup. Beige paper, punch holes, a stamp, a typewritten heading, his own words in the body.
4. `CASE FILE UPDATED — 4 / 8`
5. The counter ticks. The HUD row un-redacts.

An unrecovered evidence row in the HUD shows its label **redacted** — a black bar. The shape of the answer is the tease. Reading the whole list up front would hand over the case for free.

---

## 7. MINI-GAMES

### 7.1 Rules

1. **Every puzzle recovers real information.** No points. No score. No puzzle that exists only to be a puzzle.
2. **The puzzle fits the object.** A lock gets a combination. A running machine gets a signal trace. A pile of documents gets sorted. If the puzzle could be in front of any object, it is the wrong puzzle.
3. **No room repeats another room's games.**
4. **Failure costs nothing but time.** Retry immediately. Never lose recovered evidence. Never lock anyone out.
5. **Three failures offers a hint.** Not automatically — *offers*. Let people be stubborn.
6. **Everything is operable without a mouse.** A drag-only puzzle in a linear progression is a wall, not a difficulty setting.
7. **Under thirty seconds each.** This is a portfolio.

### 7.2 The catalogue

Drawn from FiveM interaction minigames, Among Us tasks, and detective work.

**HOUSE — 01 ABOUT**
- `BYPASS` — a marker sweeps a bar; stop it inside the lit window. Three passes, each tighter. *(FiveM lockpick)*
- `RECALL` — a sequence of symbols plays; repeat it back. *(reactor start-up)*
- `COMBINATION` — four digits, each written on something in the room.
- `SWEEP` — find one named object among everything else lying around.
- `FILING` — sort loose documents into the six drawers.
- `RECONSTRUCT` — put a sequence back into the order it really runs.

**OFFICE — 02 EXPERIENCE**
- `BADGE` — swipe an access card at the right speed. Too fast and too slow both fail. *(Among Us card swipe, and it should be funny)*
- `REWIRE` — connect coloured terminals to their matches in a junction box.
- `BOOT SEQUENCE` — bring a server rack up in the correct order; a wrong step powers it all down.
- `HANDOVER` — order a thread of messages into the sequence that actually happened.
- `DIAGRAM` — rebuild a wiped whiteboard architecture from the marker ghosts left on it.
- `TIMELINE` — place four roles on a calendar with only overlapping clues to go on.

**LAB — 03 PROJECTS**
- `TRIANGULATE` — three signal sources; move a marker until all three agree.
- `PIPELINE` — drag stages into a working request path.
- `TRACE` — scrub a log for the one line that breaks the run.
- `PROMPT CHAIN` — order the steps of an AI workflow so the output is valid.
- `QUERY` — assemble a query from clauses to return the asked-for row.
- `DEPLOY` — take a build through its stages; one wrong stage rolls the whole thing back.

**ARCHIVES — 04 EDUCATION**
- `MICROFICHE` — scrub a reel to find one record. Deliberately tactile and slightly slow.
- `TRANSCRIPT` — match subjects to results across two sheets.
- `SEMESTERS` — order terms from the evidence on the noticeboard.
- `CATALOGUE` — narrow a card index down to one drawer.
- `REASSEMBLE` — fit a torn exam paper back together.

**FACILITY — 05 SKILLS**

Six drills, one per bay. Short, physical, distinct.

- `DEVELOPMENT` — spot the broken line in a running block.
- `AI` — steer a drifting output back toward the target.
- `CLOUD` — route traffic through nodes without overloading any one of them.
- `DATABASE` — order operations so nothing deadlocks.
- `DESIGN` — match a palette and a proportion against a reference.
- `DEVOPS` — hold a system inside its limits while load rises.

**VAULT — 06 CERTIFICATES**
- `VAULT DIAL` — three dials, turned to numbers found in earlier rooms.
- `KEY CUT` — match a key's profile to a lock's.
- `SEAL` — spot the forged certificate among genuine ones.
- `INDEX` — binary-search a drawer index to the right box.
- `THE BOARD` — the finale. A corkboard, photographs and red string. Connect people, places and projects using what was learned in all five previous rooms. Getting this right closes the case.

### 7.3 Feedback

| Event | Message |
|---|---|
| Solved | `ACCESS GRANTED` |
| Failed | `ACCESS DENIED` |
| Evidence taken | `EVIDENCE RECOVERED` |
| Counter moved | `CASE FILE UPDATED` |
| Project found | `PROJECT IDENTIFIED` |
| Skill cleared | `SKILL VERIFIED` |
| Room finished | `CASE SECTION SOLVED` |

Short, mechanical, and *felt* — a sound, a small movement, a beat of silence. Never a toast that slides in from a corner.

---

## 8. INTERFACE

### 8.1 In a room

**Top left — what you are doing**

```
CASE AMR-001
ABOUT
─────────────────
LOCATION
SUBJECT'S RESIDENCE

OBJECTIVE
☑ FIND PERSONAL CLUES
☑ SOLVE MINI-GAMES
☐ COLLECT EVIDENCE
☐ LEARN THE STORY
─────────────────
Same Person.
Different Stories.
            — A.T.
```

**Top right — what you have**

```
EVIDENCE COLLECTED
4 / 8

☑ Identity
☑ Interests
☑ Work Ethic
☑ Personality
☐ ███████
☐ ██████
☐ ███████
☐ ███████████
```

**Bottom centre — where you are looking.** The viewpoint's name and one line of the investigator's own observation. This is where the writing lives. Make it dry and specific: *"Slept in. A camera and a notebook left on the covers."*

**Bottom left — how to operate it**

```
SCROLL OR ← → TO MOVE THROUGH THE ROOM
CLICK AN OBJECT TO INVESTIGATE
ESC FOR THE CASE MENU
```

The interface must never cover the middle of the frame. That is where the room is.

### 8.2 The pause menu

`ESC` freezes everything. The room stays visible behind, darkened and out of focus, so nobody loses their place in it.

```
INVESTIGATION PAUSED
THE AMRITESH FILES

RESUME
SAVE
LOAD
SETTINGS
VIEW RESUME
CREDITS
RETURN TO THE OFFICE
QUIT
```

It should feel like a game's pause screen — a considered one. `VIEW RESUME` is the escape hatch for a recruiter with four minutes: it must always be one key and one click away, and it must never be hidden behind progress.

### 8.3 Overall progress

Always visible in the hub, subtle everywhere else:

```
CASE AMR-001
PORTFOLIO EVIDENCE
██████████████░░░░░░ 71%

01 ABOUT           8 / 8   SOLVED
02 EXPERIENCE      5 / 7
03 PROJECTS        9 / 9   SOLVED
04 EDUCATION       4 / 5
05 SKILLS          3 / 6
06 CERTIFICATES    0 / 6   SEALED
```

A case with no room built yet reads `SEALED`, never `0 / 0`.

### 8.4 Saving

Progress persists. It survives leaving and coming back, and it never resets when changing rooms. Save on every find, not only when asked — losing an hour of investigation to a closed tab is not a lesson anybody needs. `SAVE` stays in the menu as a named checkpoint.

---

## 9. NEVER LET THEM ASK "WHAT NOW?"

The failure mode of this entire concept is a visitor standing in a dark room with no idea what is expected. Guard against it constantly:

- The objective panel always names the next thing.
- Arriving in a room, the first piece of evidence is somewhere obvious. Earn the right to hide things later.
- Sitting still for a while surfaces a quiet nudge: `FILE REQUIRES INVESTIGATION`.
- Leaving a viewpoint with something unfound leaves a mark on it in the HUD.
- If a room is finished except for one piece, say so: `ONE ITEM OUTSTANDING`.
- All guidance is written as an investigation system, never as website instructions. `OBJECTIVE UPDATED`, not "Click here to continue".

---

## 10. ART DIRECTION

**Dark. Cinematic. Grounded. Premium.**

**Palette:** near-black · charcoal · brown · muted beige paper · one warm tungsten source · one cold blue window. Red appears **only** where red appears in a real file — a stamp, a pin, a thread.

**Light:** one or two practical sources per room, in frame, motivated. Deep shadow everywhere else. Most of every room is dark, and that is correct.

**Never:** neon · glowing borders · cyberpunk · holograms · floating panels · sci-fi police equipment · lens flare · gore · cheap horror · anything that looks like a "hacker website".

**Make it imperfect.** This is what separates a real location from a rendered one:

- Nothing is square to anything else.
- Paper stacks are uneven. Binders lean. Frames hang crooked.
- Scuffs, scratches, ring marks, fingerprints, worn corners, peeling labels.
- Cables are visible and untidy.
- Dust in the light beams.
- Objects clustered where a person would actually leave them, empty where they would not.
- One object in every room that is out of place and slightly personal.

**Depth is non-negotiable.** Every room has a clear foreground, middle ground and background, and the camera proves it by moving. A flat picture with interface elements floating on top is the single thing this project must not be.

**Type:** a typewriter/monospace voice for everything official — labels, stamps, case numbers, the interface. A handwritten or serif italic voice for his own words — notes, annotations, the quote. The two voices must never blur.

---

## 11. SOUND

Quiet, continuous, investigative. Never frightening, never loud.

| Room | Bed |
|---|---|
| Office | wall clock, computer fan, fluorescent hum, distant traffic |
| Residence | a fan, muffled street, a clock, the room itself |
| Corporate | air conditioning, server hum, a far-off door |
| Lab | drive chatter, rack fans, a keyboard nobody is typing on |
| Archives | ventilation, paper, an electrical buzz |
| Vault | almost nothing. Your own movement. That is the point. |

Interactions get small physical sounds: paper, a latch, a drawer, a switch, a page. No music except two places — a low bed under the ending, and nothing else.

Sound is off until the visitor allows it, and there is always a mute.

---

## 12. THE ENDING

When the last piece is recovered, **do not open the portfolio.**

1. Everything goes quiet.
2. Every recovered piece of evidence flies back toward the central case file.
3. Documents stack. Photographs connect. Red string draws itself across the board.
4. The timeline assembles. Projects arrange. Skills group. Certificates stack.
5. The file closes.
6. A stamp comes down.

```
ALL EVIDENCE RECOVERED
100%

CASE AMR-001
STATUS: SOLVED
```

Then the turn. One line, held alone on the screen long enough to read twice:

> *There was never a case.*
> *You have just read a CV.*

And only then, a button that has been locked all along:

> **EXPLORE PORTFOLIO**

---

## 13. THE FINAL REPORT

The reward for an hour of work has to be genuinely excellent. This is the part a recruiter screenshots.

A **confidential investigation report**, beautifully typeset. Polished and professional. Game-flavoured, not game-like.

**Opening:**

```
THE AMRITESH FILES
CASE AMR-001
CASE STATUS: SOLVED

SUBJECT: AMRITESH TIWARI
```

**Sections:** IDENTITY · ABOUT · EXPERIENCE · PROJECTS · EDUCATION · SKILLS · CERTIFICATES · ACHIEVEMENTS · CONTACT

**Visual language:** evidence stamps · file numbers · document textures · photographs with tape · handwritten margin notes · evidence tags · dates · case references · a few tastefully redacted lines that are clearly decorative.

**But readability wins every argument.** Real hierarchy, real spacing, real contrast. Every section should be scannable in five seconds. A hiring manager must be able to get everything they need without playing a second of the game — and a `DOWNLOAD FULL REPORT` gives them the plain version.

### 13.1 Contact

Not "Contact me".

> **CLOSE THE CASE**
>
> You've reconstructed the file.
> But every investigation eventually leads to a new case.
> Interested in opening one?

```
NAME
EMAIL
MESSAGE

[ SEND TRANSMISSION ]
```

Sending should feel like filing a report: a stamp, a case number assigned, a confirmation written as a receipt.

---

## 14. EASTER EGGS

Optional. Never required. Never blocking.

- A seventh binder behind the others: **`CASE AMR-000`**.
- The desk computer accepts typed commands. `whoami` → `AMRITESH.TIWARI`. A handful of others.
- Something hidden behind the shelf, reachable only from one viewpoint.
- A photograph that changes the second time you look at it.
- A drawer that is always locked, in every room, and opens in the vault.
- An achievement: **`CLASSIFIED ACCESS`**.

---

## 15. ACCESSIBILITY

Not optional, and cheap to do:

- Everything playable by keyboard alone.
- Colour is never the only signal — symbols and text carry meaning too.
- Reduced motion: the camera still moves, because that is navigation, but decoration stops and the pointer-lean is off.
- The typewriter text is readable in full immediately by anyone who does not want to wait.
- Interface text stays legible on the dark backgrounds. Test it.
- Full text alternatives for every recovered document.

---

## 16. SMALL SCREENS

Desktop is the primary experience and should stay that way.

On a phone, **simplify the camera, do not shrink the layout.** Fewer viewpoints, wider hit areas, swipe between viewpoints, the evidence rail collapses to a count. Mini-games are redesigned for thumbs, not scaled down.

Keep the feeling: *explore → discover → recover → investigate.* Lose anything else before losing that.

---

## 17. THE CONTENT RULE

**This one is absolute.**

The mystery is fiction. The case number, the department, the missing-person framing, the puzzles — all invented, all fine.

**Every professional fact must be true and must come from the real portfolio data.** Do not invent a company, a role, a date, a certification, a metric, a client or an achievement. Not one.

If a field has no data, show a clearly marked placeholder:

> **RECORD INCOMPLETE**
> No statement of technical interests is on file for the subject.

A visible gap is honest. An invented credential is a lie with his name on it.

---

## 18. THE BAR

The finished thing should feel like:

> **a short detective game that happens to be a developer portfolio.**

Not:

> a portfolio website with some game animations.

The journey to aim for:

> "I've entered a confidential system." → "What is this?" → "There's a room." → "Those folders must be important." → "Why am I in his house?" → "That folder is locked." → "I need to solve this." → "I just found a project." → "I found his experience." → "I've reconstructed the timeline." → "100%." → "Case solved." → **"Oh. This is actually his portfolio."**

The last feeling should be that the visitor **earned it.**

---
---

# APPENDIX — IMAGE GENERATION PROMPTS

Seven environments. Use the shared style block with every one so all seven read as the same location scout on the same night with the same camera.

## The style block

Append to every scene prompt:

```
cinematic still, photorealistic, shot on ARRI Alexa, 35mm anamorphic lens,
shallow depth of field, strong foreground/midground/background separation,
low-key lighting, single motivated practical light source, deep shadows,
mostly dark frame, colour palette of near-black charcoal warm brown and
muted beige paper, one warm tungsten source and one cold blue window spill,
volumetric dust in the light, film grain, subtle vignette, lived-in and
cluttered, imperfect and asymmetric, worn surfaces, nothing aligned,
ultra detailed, 16:9 widescreen, no people, no text overlay

--no people, faces, neon, glowing edges, holograms, cyberpunk, sci-fi,
lens flare, blood, gore, weapons, clean minimal studio lighting, symmetry,
HDR, oversaturation, floating UI, watermark
```

> **Aim off-centre.** Compose every shot so the key object sits left or right of frame, not dead centre — the interface lives in the corners and the camera needs somewhere to travel.

---

### 1 — THE INVESTIGATION ROOM

```
A detective's private office inside a police department at night, lit only by
a single desk lamp and a failing overhead fluorescent tube. In the centre
background, a tall dark wooden shelving unit holding six thick upright ring
binders, spines facing out, each with a worn paper label, leaning at slightly
different angles. On the left wall a large whiteboard covered in handwritten
case notes, beneath it grey metal filing cabinets and stacked cardboard
evidence boxes. On the right a window with venetian blinds half open, cold
blue city light and distant lit windows beyond. Beside it a large corkboard
covered in pinned photographs, a street map, handwritten notes and red string
connecting them. In the foreground a heavy wooden desk with two glowing
monitors, a keyboard, a telephone, scattered paperwork, a cold cup of coffee
and a brass nameplate. A worn black leather office chair sits empty. Deep
shadow fills most of the room.
```

### 2 — THE SUBJECT'S RESIDENCE

```
A young software developer's bedroom and home workspace at night, lived in
and slightly messy, warm and personal rather than sinister. An unmade bed with
plaid bedding, a camera and an open notebook left on the covers. A bedside
table with a lit lamp, a framed photograph and a digital clock reading 23:47.
A wall covered in pinned polaroid photographs, a street map and a typographic
poster. An open doorway to a cold blue lit hallway. A desk against the right
wall with two monitors still displaying code, a warm angled desk lamp, a
hoodie over the chair. Above the desk, handwritten words directly on the wall
and a small whiteboard with a ticked checklist. A bookshelf and an acoustic
guitar in the corner. In the foreground a low wooden coffee table with an open
notebook, a dark ceramic mug, a stack of books, a phone, earbuds and keys. A
backpack and trainers on the floor. Warm lamplight pools against cold blue
from the doorway.
```

### 3 — THE CORPORATE OFFICE

```
An empty modern software company office late at night, overhead lights off,
lit by standby monitor glow and one strip of light from a corridor. Rows of
developer desks with dual monitors on standby, office chairs pushed in at
careless angles, one jacket left over a chair back. A glass-walled meeting
room in the midground with a long table and whiteboards covered in
architecture diagrams and boxes and arrows. Employee badges on lanyards on a
desk. A server cupboard with its door ajar showing green and amber status
lights. Project boards with columns of sticky notes. A printer with abandoned
output in its tray. Scattered mugs, cables and stationery. Cold blue and
green light, deep shadow, a large window showing a city skyline at night.
```

### 4 — THE DEVELOPER'S LAB

```
A dim technical workspace at night that feels like an operations room. A curved
wall of six monitors, one showing a dark map with vehicle markers and routes,
one showing scrolling logs, one a database console mid-query, one an AI chat
interface with a waiting cursor. A black server rack against the side wall with
blinking green status lights and untidy cable runs. Architecture diagrams
printed and taped overlapping on the wall, annotated in marker. A whiteboard of
boxes and arrows. A heavy desk with a mechanical keyboard, open notebooks of
system sketches, a soldering iron, a coffee cup and a single warm desk lamp.
Cable spaghetti along the floor. Cold monitor light against one warm lamp,
everything else in deep shadow.
```

### 5 — THE COLLEGE ARCHIVES

```
A university records archive in the basement, after hours, institutional and
cold. Tall rolling stacks of grey archive shelving packed with labelled box
files, receding into darkness. A microfiche reader still switched on, glowing
pale green on a desk. A wooden library reading desk with a green banker's lamp,
stacked exam papers and open ledgers. A wall-mounted noticeboard with pinned
timetables, results sheets and faded notices. A wooden card catalogue with
brass drawer handles. A locked grey records cabinet. A stopped wall clock. Bare
concrete floor, patchy fluorescent light with several tubes dead, long
shadows between the stacks, dust in the air.
```

### 6 — THE TRAINING FACILITY

```
A concrete assessment and training hall at night, industrial and utilitarian.
Six numbered equipment bays along one wall, each lit by its own overhead lamp,
only some of them switched on, each bay holding different equipment —
workstations, server gear, testing rigs, drafting boards. Black rubber matting
on the floor. A scoreboard display on the far wall. A glass observation booth
raised on one side, dark inside. Equipment racks and cable runs along the
floor. A clipboard hanging on a hook. Exposed concrete walls and ceiling
ducting, cold overhead light in pools with deep darkness between them, one
warm lamp in the nearest bay.
```

### 7 — THE LOCKED ARCHIVE

```
A secure document vault at night, the most guarded room in a building. A heavy
steel vault door standing open on the left, thick with locking bolts. Walls of
numbered brass safe-deposit drawers from floor to ceiling, receding into
darkness. In the centre a plain examination table under a single hanging lamp,
with a sealed document box, white cotton gloves and an open ledger on it.
Archive shelving behind a steel cage. Stacked sealed evidence containers.
Dust hanging in the single beam of light. Almost entirely dark apart from the
one hard pool of light on the table, cold and still, deep black shadows.
```
