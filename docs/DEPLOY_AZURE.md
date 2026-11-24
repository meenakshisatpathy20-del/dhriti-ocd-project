# Deploy Dhriti on Microsoft Azure

Dhriti is a single Node.js service (web app + API), so it runs on **Azure App Service (Linux)** with no code changes. Students can use **Azure for Students** (free credit, no credit card): https://azure.microsoft.com/free/students

You get a public HTTPS address like `https://dhriti-yourname.azurewebsites.net`. HTTPS is required for the microphone.

---

## Option A · Azure Portal + GitHub (no command line, about 10 minutes)

### 1. Create the Web App
1. Go to https://portal.azure.com and sign in.
2. Search **App Services** → **Create** → **Web App**.
3. Fill in:
   - **Subscription:** Azure for Students
   - **Resource group:** Create new → `dhriti-rg`
   - **Name:** `dhriti-<yourname>` (this becomes your URL)
   - **Publish:** Code
   - **Runtime stack:** **Node 22 LTS**
   - **Operating system:** **Linux**
   - **Region:** Central India (or the nearest one available)
   - **Pricing plan:** **Basic B1** recommended (Free F1 works but has a daily CPU limit and sleeps)
4. **Review + create** → **Create**. Wait about 1 minute → **Go to resource**.

### 2. Settings
1. Left menu → **Settings → Environment variables** → **App settings** → **+ Add** each of these, then **Apply**:

   | Name | Value |
   |---|---|
   | `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |
   | `ADMIN_TOKEN` | a long secret you choose (for `/admin`) |
   | `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | optional: any OpenAI-compatible model |

2. Left menu → **Settings → Configuration** → **General settings**:
   - **Startup Command:** `npm start`
   - **Always on:** On (B1 and above), so the first visit is not slow
   - **Save**.

### 3. Connect GitHub
1. Left menu → **Deployment → Deployment Center**.
2. **Source:** GitHub → **Authorize** → choose your account, repository `dhriti-ocd-project`, branch `main`.
3. **Save**. Azure adds a GitHub Actions workflow to the repository and starts the first deployment. Watch it under the repo's **Actions** tab (about 4-6 minutes). It runs `npm install`, `npm run build` and the tests.

### 4. Open it
- **Overview → Default domain** → open the link. Check `https://<your-app>.azurewebsites.net/api/health` returns `{"ok":true,...}`.
- Admin console: `/admin` with your `ADMIN_TOKEN`.
- Every `git push` to `main` now redeploys automatically.

---

## Option B · Azure CLI (one command)

Install the Azure CLI (https://learn.microsoft.com/cli/azure/install-azure-cli), then in the project folder:

```bash
az login
```

```bash
az webapp up --name dhriti-<yourname> --resource-group dhriti-rg --location centralindia --runtime "NODE:22-lts" --sku B1
```

```bash
az webapp config appsettings set --name dhriti-<yourname> --resource-group dhriti-rg --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true ADMIN_TOKEN=<a-long-secret>
```

```bash
az webapp config set --name dhriti-<yourname> --resource-group dhriti-rg --startup-file "npm start"
```

Redeploy after changes by running the same `az webapp up` command again.

---

## Option C · Azure Container Apps (Docker)

The repository includes a `Dockerfile`:

```bash
az containerapp up --name dhriti --resource-group dhriti-rg --location centralindia --source . --ingress external --target-port 8787 --env-vars ADMIN_TOKEN=<a-long-secret>
```

---

## Good to know

- **Patient data** stays on each phone (browser storage), so it is never lost by a redeploy.
- **Server data** (professionals, bookings, chats, uploaded certificates) is stored in files on the app. App Service keeps `/home` across restarts, but a fresh deployment can reset it. For a real pilot, move it to Azure Database for PostgreSQL and Azure Blob Storage.
- **Cost:** B1 is about US$13/month, covered by student credit. Stop the app from **Overview → Stop** when you are not using it.
- **Troubleshooting:** **Monitoring → Log stream** shows server logs. If the site shows "Application Error", check that the startup command is `npm start` and the runtime is Node 22.
- **Data protection:** health data is sensitive personal data under India's DPDP Act 2023. Keep the region in India (Central India / South India) for any real-user pilot.
