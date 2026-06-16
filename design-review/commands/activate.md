---
description: Activate design-review Pro with your license key
---

The user wants to activate design-review Pro. Their license key is: `$ARGUMENTS`

Do this:

1. If `$ARGUMENTS` is empty, ask the user to paste the key from their purchase
   (the page at crit.officialjp.com/activate.html after checkout) and stop.

2. Validate the key against the license server:
   ```
   curl -s "https://design-review-pro.jprimiani.workers.dev/verify?key=$ARGUMENTS"
   ```

3. If the response contains `"valid":true`:
   - Save the key locally so future reviews can use it:
     ```
     mkdir -p ~/.design-review && printf '%s' "$ARGUMENTS" > ~/.design-review/license
     ```
   - Tell the user: "Pro activated. Mobile & SwiftUI rubric and brand-token checks
     are now available. Run a design review on a URL, screenshot, or component and
     I'll use the Pro depth."

4. If `"valid":false` or an error:
   - Do NOT save anything.
   - Tell the user the key was not recognized, to double-check it, and that they can
     re-find it at crit.officialjp.com/activate.html or email jprimiani@gmail.com.

Never invent or guess a key.
