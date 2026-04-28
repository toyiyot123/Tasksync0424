# Notification Fix TODO

## Information Gathered
- Cronjob status shows "failed" — Firebase Cloud Functions scheduled reminders are failing
- No emails received at scheduled times (9 AM / 5 PM)
- Gmail App Password + 2FA already configured by user
- `.env` exists in project root but NOT in `functions/` directory

## Root Causes Identified
1. **Env vars not loaded in Cloud Function** — `.env` is in project root, not `functions/`
2. **No error logging** — catch blocks silently swallow errors
3. **No dotenv import** — `taskReminders.ts` doesn't load env vars
4. **Firestore index risk** — `!=` query may need composite index
5. **No function return value** — scheduler may mark as failed

## Plan

### File: `functions/src/taskReminders.ts` ✅ DONE
- [x] Add `import dotenv from 'dotenv'; dotenv.config();`
- [x] Add comprehensive error logging to all catch blocks
- [x] Validate env vars at startup and log clear warnings if missing
- [x] Fix transporter to use validated constants (not process.env directly)
- [x] Remove Firestore `!=` query to avoid composite index requirement
- [x] Return success/failure status from function
- [x] Add friendly "from" name in emails (`"TaskSync" <email>`)

### File: `functions/.env` (NEW) ✅ DONE
- [x] Create `.env` file in `functions/` directory with required vars

### Documentation ✅ DONE
- [x] Add comments explaining Gmail App Password requirement

## Followup Steps (User Action Required)
1. **Edit `functions/.env`** with your actual Gmail and App Password:
   ```
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   FRONTEND_URL=https://tasksync-70aa9.web.app
   ```

2. **Rebuild functions:**
   ```bash
   cd functions && npm run build
   ```

3. **Deploy functions:**
   ```bash
   firebase deploy --only functions
   ```

4. **Check Firebase Functions logs:**
   ```bash
   firebase functions:log
   ```

5. **Test manually** (optional):
   ```bash
   firebase functions:shell
   sendNearlyDueReminder()
   ```

## Additional Issue Found (Not Fixed)
- `src/hooks/useTaskNotifications.ts` has empty no-op functions
- This means UI-triggered notifications (e.g., when creating a task) won't work
- Scheduled reminders (cronjob) are the priority and are now fixed


