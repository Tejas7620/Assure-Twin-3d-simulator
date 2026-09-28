# REFERENCE_INTEGRATION.md — Reference Repository Compliance (§8)

**Reference repository:** https://github.com/Akil-Ai/Oil-Twin-Ai
**Directive (§8, verbatim intent):** *Before copying ANY code from the reference repository: inspect its LICENSE. If direct source-code reuse is not legally permitted, DO NOT copy source code verbatim. Instead, independently implement the concept and record it here.*

---

## 1. License determination status

**Status: NOT YET VERIFIED — `WebFetch` was blocked by the classifier outage during the audit window.**
**[REQUIRES EXECUTION]** When tooling recovers, run the license check (see §4) and replace this section with the verified result.

**Conservative operating assumption until verified:** treat the reference as **"no verbatim reuse permitted."** This is the safe default and, as shown in §2, it costs us nothing because **no verbatim reuse has occurred or is planned.**

---

## 2. Reuse posture — CLEAN-ROOM, regardless of license

This project uses the reference repository **only as conceptual inspiration**, not as a source of copied code. This holds independent of what the license turns out to be:

- **No files** were copied from the reference into this repository.
- **No functions, classes, or code blocks** were transcribed verbatim.
- All physics, AI, optimization, and assurance code in `backend/app/*` and `src/assure/*` is **independently implemented** from first principles and standard petroleum-engineering references (Andrade viscosity, Marx-Langenheim / Boberg-Lantz thermal, Vogel/Darcy IPR, API 11L/11AX pump & rod mechanics, Goodman fatigue, differential-evolution optimization). These are **public-domain engineering methods**, not reference-specific IP.
- Verified during audit: the codebase carries no reference-repo attributions, no matching module/identifier naming, and no license headers from the reference.

**Therefore §8 is satisfied by construction:** even under the strictest license, our clean-room, independently-implemented approach requires no copied source.

---

## 3. Concept-level inspiration (independently implemented)

| Concept borrowed as *idea only* | Our independent implementation |
|---|---|
| "AI digital twin for oil wells" framing | Our own 15-domain coupled twin (`backend/app/twin/*`) + client chain (`src/assure/*`) |
| Surrogate ML for production prediction | Our seeded RandomForest (`ai/surrogate.py`) + honest demo regressor (`MLPredictionProvider.ts`) — standard scikit-learn, our own features |
| Assurance / trust gating | Our own 12-checkpoint gate + no-safe-rec/abstain design (`assurance/*`) — our formulation |
| Optimization of operating setpoints | Our own SciPy differential-evolution objective (`css_optimizer.py`) — our objective/constraints |

None of the above required inspecting reference source; all are derivable from the problem statement and standard engineering literature.

---

## 4. Verification procedure to finalize this doc [REQUIRES EXECUTION]
1. `WebFetch https://github.com/Akil-Ai/Oil-Twin-Ai` → read LICENSE / license badge / README.
2. Record the exact license (MIT / Apache-2.0 / GPL / none / other) in §1.
3. If permissive **and** we ever choose to reuse a snippet: add the required attribution/notice and log the exact file+lines here. (Currently N/A — nothing reused.)
4. If restrictive or unlicensed: confirm the clean-room posture in §2 remains fully honored (it does).
5. Re-grep the repo for any accidental reference-derived strings/headers before shipping.

---

## 5. Summary
- **Reuse:** none (clean-room).
- **License risk:** none under our posture, pending routine verification.
- **Action required:** finalize §1 with the verified license once `WebFetch` is available; no code change is contingent on the result.
