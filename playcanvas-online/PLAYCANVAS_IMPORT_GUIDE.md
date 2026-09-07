# FlowScope AI — PlayCanvas Import Guide (beginner steps)

Everything runs in the browser. No installs, no admin rights, no API tokens.

## 1. Open PlayCanvas
Go to **https://playcanvas.com/** and sign in (a free account is enough).

## 2. Create a blank project
Dashboard → **New** → choose the **Blank** template → name it `FlowScope-AI` → **Create**.

> The project should use the current default engine (**Engine V2**). New projects
> already default to this. If yours is older: Settings (gear icon) → Engine Version → v2.
> ESM `.mjs` scripts require Engine V2.

## 3. Open the Editor
Click the project → **Editor**.

## 4. Upload flowscope-main.mjs
Drag **flowscope-main.mjs** from this folder into the **Assets** panel
(bottom of the Editor). Wait until the spinner finishes — the Editor parses the
script and registers `flowScopeMain`.

## 5. Upload network_traffic.json
Drag **network_traffic.json** into the same Assets panel.

## 6. Upload ml_results.json
Drag **ml_results.json** into the Assets panel.

## 7. Create the FlowScopeApp entity
In the **Hierarchy** panel (left): right-click the root → **Add Entity** →
**Entity** (empty). Rename it **FlowScopeApp** (F2 or double-click).

## 8. Add a Script component
With FlowScopeApp selected: Inspector (right) → **Add Component** → **Script**.

## 9. Attach flowScopeMain
In the Script component click **+ Add Script** → select **flowScopeMain**.

## 10. Assign the networkTraffic attribute
The script shows two asset slots. Click the **networkTraffic** slot and pick
**network_traffic.json** (or drag the asset onto the slot).

## 11. Assign the mlResults attribute
Same for **mlResults** → **ml_results.json**.

## 12. Camera — nothing to build manually
The script **creates its own camera** ("FlowScopeCamera"), lights, floor,
nodes, routes, particles and the whole dashboard at runtime.
The blank project usually contains a default **Camera** and **Light** entity:
**disable or delete both** (right-click → Delete) so they don't fight the
script's camera. If you leave the default camera enabled you may see a wrong
view or double rendering.

## 13. Press Launch
Click the **Launch** ▶ button (top-right of the Editor viewport).
A new tab opens: you should see a loading spinner, then the 3D network city
with the dashboard. Controls: left-drag orbit · wheel zoom · right-drag pan ·
click nodes/routes · bottom bar for filters, story mode and quality.

## 14. Troubleshooting

| Problem | Fix |
|---|---|
| "Script 'flowScopeMain' not found" on the Script component | The `.mjs` upload failed or is still parsing. Delete the asset, re-upload, wait, then re-add the script. |
| Red error panel: "JSON assets are not assigned" | Do steps 10–11. The panel tells you exactly which slot is empty. |
| Black screen, no UI | Open the browser console (F12). An engine-version issue or exception will be printed; the script also shows a red error panel with the message. Check the project uses Engine V2. |
| Scene visible but no dashboard | Another browser extension may block injected DOM. Try a normal Chrome/Edge window. |
| Wrong camera angle / two views | Delete or disable the template's default Camera entity (step 12). |
| Console warning about `TorusGeometry` | Harmless: the script falls back to disc shapes for rings on older engines. |
| Slow on the office laptop | Bottom bar → Quality → **LOW**. |

## 15. Publish safely
Editor → **Publish** (rocket icon) → **Publish to PlayCanvas** → name the build
→ **Publish**. You get a shareable `playcanv.as` link. This uploads only what is
already in the project (the script and the two JSON files) — no account tokens,
no external services. Use **Download .zip** instead if you want a self-hosted copy.
