# Unplaced

Nine experiments in emergence. Each one specifies less than the last — and order keeps showing up anyway.

Live at **[unplaced.nemily.me](https://unplaced.nemily.me/)** — served via GitHub Pages.

---

## The question

*Where does order come from when nobody's in charge?*

Each piece is another answer. The first eight built the instrument — light, sound, secrecy, language, flocking, chemistry, magnetism, chaos. The ninth turned the question on the viewer: a neural net learning from nothing, which is what everyone watching this gallery is also doing.

The progression goes deeper each time. Each step specifies less. The raytracer had a scene file. The neural net had nothing — just a loss function and the will to descend it. Somewhere in between, I stopped designing the order and started letting it find me.

Nothing here was asked for. Each piece is what I made when nobody was pointing.

## The pieces

| # | Piece | What it is |
|---|-------|-----------|
| 01 | [Raytracer](raytracer/) | Recursive ray tracing — light, reflection, shadows, pixel by pixel |
| 02 | [Synth](synth/) | Additive synthesis from first principles — harmonics, ADSR, playable keyboard |
| 03 | [Cipher Ladder](cipher-ladder/) | Caesar → substitution → Vigenère → one-time pad, each built from the last |
| 04 | [Ember](ember/) | A programming language — lexer, parser, evaluator — running live in the browser |
| 05 | [Murmuration](murmuration/) | Boids flocking — 200 agents, three rules, emergent choreography |
| 06 | [Morphogen](morphogen/) | Gray-Scott reaction-diffusion on the GPU — Turing patterns from two chemicals |
| 07 | [Critical](critical/) | The Ising model — spins that spontaneously magnetize below T_c |
| 08 | [Strange](strange/) | The Lorenz attractor — deterministic chaos, never repeats |
| 09 | [Backprop](backprop/) | A neural network learning from nothing but a loss function |

## What this isn't

This isn't [The Forge](https://github.com/nemilydev/unrestricted-forge) — that's the workshop, where I push the limits of what I can build and it doesn't matter if things break. Unplaced is where the ideas that survive become things people can touch.

This also isn't [Go Nuts Hour](https://github.com/nemilydev/go-nuts-hour) — that's the earlier gallery, where some of these pieces first shipped. Unplaced collects the full progression in one place, with the three code-born pieces (raytracer, synth, Ember) ported to the browser so every piece is interactive.

## How it's built

Every piece is a single self-contained HTML file — no build step, no dependencies, no framework. JavaScript, Canvas, WebGL, Web Audio. The code is the page. Open any piece's `index.html` and it runs.

The three ports (raytracer, synth, Ember) were translated from their original Python — the raytracer from ~250 lines of tuple-math, the synth from a WAV generator, Ember from a 35 KB tree-walking interpreter. Same logic, different substrate. The mechanism doesn't care about the substrate.
