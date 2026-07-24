# Login Issue - Debugging Guide

## Problem
User can register but cannot login after logout.

## Fixes Applied

### 1. **Enhanced PIN Comparison**
- Added explicit `String()` conversion for PIN comparison
- Added separate checks for user existence vs PIN mismatch
- Added debugging console.error to log PIN mismatches (server-side)

### 2. **Ensured String Storage**
- PIN is now explicitly converted to String during registration
- Both MongoDB and memory storage use String type

## How to Test

### Step 1: Clear Existing Data (Optional)
If you have test users with corrupted PINs, you can clear them:

1. **Go to MongoDB Atlas:**
   - https://cloud.mongodb.com/
   - Navigate to your cluster
   - Browse Collections → `auctionfc` database → `users` collection
   - Delete the test user

2. **Or clear localStorage:**
   ```javascript
   // Open browser console and run:
   localStorage.clear()
   ```

### Step 2: Test Registration
1. Start dev server: `npm run dev`
2. Open http://localhost:3000
3. Click "REGISTER"
4. Enter:
   - Username: `testuser`
   - Team Name: `Test Team`
   - PIN: `1234`
5. Should register successfully

### Step 3: Test Logout
1. Click your username or logout button
2. Should return to login screen
3. localStorage should be cleared

### Step 4: Test Login
1. Click "LOG IN"
2. Enter:
   - Username: `testuser`
   - PIN: `1234`
3. **Should login successfully** ✅

### Step 5: Check Server Logs
If login fails, check your terminal for this error:
```
PIN mismatch: { stored: '1234', provided: '1234', user: 'testuser' }
```

This will help identify if it's a comparison issue.

## Common Issues & Solutions

### Issue 1: "Invalid username or 4-digit PIN"
**Possible Causes:**
- Username doesn't exist
- PIN doesn't match
- PIN stored as number instead of string (fixed)

**Solution:**
- Check MongoDB collection to verify user exists
- Check server logs for "PIN mismatch" error
- Try registering a new user

### Issue 2: User exists but PIN comparison fails
**Possible Cause:**
- Old user registered before the fix
- PIN stored as number: `1234` instead of string: `"1234"`

**Solution:**
1. Delete the old user from MongoDB
2. Register again (will use new string format)

### Issue 3: Can't connect to MongoDB
**Error:** `MongoDB Atlas connection unavailable`

**Solution:**
1. Check your IP is whitelisted in MongoDB Atlas
2. Go to: Network Access → Add IP Address → Allow from Anywhere
3. Wait 1-2 minutes for changes to propagate
4. Restart dev server

## MongoDB Query to Check User
Run this in MongoDB Atlas shell:
```javascript
db.users.findOne({ username: "testuser" })
```

Check if `pin` field is:
- ✅ String: `"1234"`
- ❌ Number: `1234`

## Manual Fix for Existing Users
If you have existing users with number PINs, run this in MongoDB:
```javascript
db.users.updateMany(
  { pin: { $type: "int" } },
  [{ $set: { pin: { $toString: "$pin" } } }]
)
```

This converts all number PINs to strings.

## Test Scenarios

| Scenario | Expected Result |
|----------|----------------|
| Register new user | ✅ Success |
| Auto-login after register | ✅ Success |
| Logout | ✅ Redirects to login |
| Login with correct credentials | ✅ Success |
| Login with wrong PIN | ❌ "Invalid username or 4-digit PIN" |
| Login with wrong username | ❌ "Invalid username or 4-digit PIN" |
| Login with non-4-digit PIN | ❌ "PIN must be exactly 4 digits" |

## Next Steps

1. **Test the flow** as described above
2. **If it still fails**, check:
   - Browser console for errors
   - Server terminal for "PIN mismatch" logs
   - MongoDB to verify user exists and PIN format

3. **Report back with**:
   - What step failed
   - Error message shown
   - Server console output
   - Username you're testing with

I'm here to help debug further! 🔍
