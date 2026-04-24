# Render.com Deployment Guide - TaskSync Notifications

## Step 1: Prepare GitHub Repository

Push your code to GitHub (if not already there):

```bash
git init
git add .
git commit -m "Add Render.com deployment config"
git push origin main
```

## Step 2: Deploy to Render.com

1. Go to https://render.com and sign up (free)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repo containing TaskSync
5. Configure:
   - **Name:** `tasksync-notifications`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** `Free`

## Step 3: Set Environment Variables

In Render dashboard, add these as environment variables:

| Key | Value | Note |
|-----|-------|------|
| `NODE_ENV` | `production` | |
| `VITE_FIREBASE_PROJECT_ID` | `tasksync-70aa9` | |
| `SMTP_USER` | `tasksyncscheduler@gmail.com` | |
| `SMTP_PASSWORD` | `mqgu ncmm jdiv vrtl` | **Keep secret!** |
| `SERVER_SECRET` | Your custom secret | Change this! |
| `FRONTEND_URL` | `https://tasksync-70aa9.web.app` | |

⚠️ Mark `SMTP_PASSWORD` and `SERVER_SECRET` as "Secret" in Render dashboard

## Step 4: Deploy

Click "Create Web Service" → Render deploys automatically

Your server will be live at: **`https://tasksync-notifications-xxxxx.onrender.com`**

(Render provides the URL after deployment)

---

## Step 5: Set Up Automated Notifications (EasyCron)

1. Go to https://easycron.com (free account)
2. Click "Cron Jobs" → "Create a Cron Job"
3. Configure for 9 AM:
   - **HTTP(S) Request URL:** `https://your-render-url.onrender.com/send-all-notifications`
   - **Method:** POST
   - **Headers:** Add `x-server-secret: YOUR_SERVER_SECRET`
   - **Cron Expression:** `0 9 * * *` (9 AM UTC daily)
   - **Body (JSON):** 
     ```json
     {}
     ```

4. Create another job for 5 PM:
   - Same URL and headers
   - **Cron Expression:** `0 17 * * *` (5 PM UTC daily)

✅ Done! Notifications will send automatically at 9 AM and 5 PM daily.

---

## Verification

Test your deployment:

```bash
curl https://your-render-url.onrender.com/health
```

Should return: `{"status":"Server is running",...}`

---

## Important Notes

- **Free tier:** Render puts inactive apps to sleep after 15 mins
- **Solution:** EasyCron jobs will wake it up when triggered
- **Logs:** Check Render dashboard for logs if issues occur
- **Cost:** Completely FREE for your use case

## Troubleshooting

If notifications don't send:
1. Check Render logs for errors
2. Verify environment variables are set correctly
3. Test health endpoint: `curl https://your-render-url.onrender.com/health`
4. Check EasyCron logs to see if it's triggering

---

**Ready? Let me know your Render URL after deployment and I can help test it!**
