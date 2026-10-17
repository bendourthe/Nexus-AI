/**
 * v2.14.0 (inherited gap WN-3) -- a user-skills root outside the source tree.
 *
 * Skill tests used `path.join(<source catalog>, "__none__")` for "no user
 * skills"; the loader creates that directory, which left empty folders inside
 * `modules/coding/skills/catalog/`. This path lives under the OS temp dir.
 */

import * as os from "node:os";
import * as path from "node:path";

export const NO_USER_SKILLS_DIR = path.join(os.tmpdir(), "nexus-test-no-user-skills");
