# mark.putiyon.net

Source for [mark.putiyon.net](https://mark.putiyon.net): a static site deployed on Vercel (project `mark-putiyon`).

## How changes go live

1. Create a branch and make your changes.
2. Open a pull request. GitHub Actions runs `scripts/check-site.mjs`; if it passes, a Vercel preview is deployed.
3. Merge to `main`. The same checks run again, and only if they pass does the site deploy to production.

The Vercel project is deliberately **not** linked to Vercel's own Git integration, so nothing deploys until the tests are green.

## Run the checks locally

```
node scripts/check-site.mjs
```

The checks cover: valid `vercel.json`, page title, description and language, alt text on every image, every referenced local file exists, and no asset over 2 MB.

## One-time setup (repository secrets)

Add these under Settings > Secrets and variables > Actions:

| Secret | Where to get it |
| --- | --- |
| `VERCEL_TOKEN` | Vercel > Account Settings > Tokens |
| `VERCEL_ORG_ID` | `team_wxZVNJKn11EBhoxPuTP0s8Rb` |
| `VERCEL_PROJECT_ID` | `prj_hMVFcxldVMOhA1ilAPIhw4m42wyP` |

Recommended: protect `main` (Settings > Branches) and require the `test` check to pass before merging.
