# v2.5.1 Phase 1 -- accessibility gate

`eslint-plugin-jsx-a11y` is on the desktop flat config as warnings. A fixture proves the click-event rule loads. axe-core checks the four pillar routes against `(route, rule, selector)` triples. jsdom reported none, so the baseline is empty, and a nameless button still fails `button-name`.

## Plan delta

**No delta.** The 53 existing warnings stay unfixed under `MT-v251-1`. The lint ceiling is 53.
