---
applyTo: '**/devcontainer.json,**/.devcontainer/**,**/.devcontainer.json,**/devcontainer-feature.json,**/devcontainer-template.json'
description: Points at the devcontainers skill for dev container files.
---

Before editing any of these files, consult the `devcontainers` skill. It carries the
cited rule corpus, the specification mechanics, and the audit checklist. Do not restate
its rules here.

<!--
This file is deliberately contentless. It exists only because VS Code has silent,
path-scoped inline-edit surfaces where no chat message describes the task, so
description-based skill matching never fires. Carrying no guidance is what makes it
unable to drift out of step with the corpus.

ADDING A RULE, A DEFAULT, A SEVERITY OR AN EXAMPLE TO THIS FILE IS A REVIEW-BLOCKING
CHANGE. The moment it carries guidance it becomes a second corpus with no citation
invariant and no verification pass behind it.

Its mechanism is UNPROVEN. See README.md, "The `.github/instructions/` pointer is
untested", for what is documented, what is not, and the exact experiment a human must
run to settle it.
-->
