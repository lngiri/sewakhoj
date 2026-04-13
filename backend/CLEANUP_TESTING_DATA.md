# Clearing Testing Data

This document explains how to erase all testing data from the SewaKhoj application.

## Overview

When testing the application, you may accumulate test data in the database. This guide provides multiple methods to clear all testing data.

## Methods to Clear Testing Data

### Method 1: Using the Command Line Script (Recommended)

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Run the cleanup script:
   ```bash
   node clearTestingData.js
   ```

3. The script will:
   - Show current data counts
   - Ask for confirmation (type "DELETE" to proceed)
   - Delete all bookings, workers, and ratings
   - Provide a summary of deleted records

### Method 2: Using the Admin API Endpoint

1. Ensure the server is running:
   ```bash
   cd backend
   npm start
   ```

2. Obtain an admin authentication token by logging in at `/api/admin/login`

3. Send a DELETE request to the cleanup endpoint:
   ```bash
   curl -X DELETE http://localhost:5000/api/admin/clear-testing-data \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

4. The endpoint will return:
   ```json
   {
     "success": true,
     "message": "All testing data cleared successfully",
     "deleted": {
       "bookings": 58,
       "workers": 9,
       "ratings": 7
     }
   }
   ```

### Method 3: Using the Admin Panel Web Interface (Easiest)

The admin panel now includes a dedicated "Clear Testing Data" button for easy one-click cleanup:

1. Log in to the admin panel at `https://sewakhoj.com/adminsewa.html`
2. In the sidebar, click the **🧹 Clear Testing Data** button (red-colored for caution)
3. A modal will appear showing current data counts:
   - Bookings count
   - Workers count
   - Ratings count
4. Review the counts and click **🧹 Delete All Data** to proceed
5. Confirm the final warning dialog
6. The system will delete all data and show a success message with deletion counts

**Features:**
- Shows real-time data counts before deletion
- Double confirmation for safety (modal + JavaScript confirm)
- Visual warning with red styling
- Updates all dashboard sections automatically after cleanup
- No command line or API knowledge required

### Method 3: Manual MongoDB Operations

You can also connect directly to MongoDB and run:

```javascript
// Connect to MongoDB
use sewakhoj

// Delete all documents from collections
db.bookings.deleteMany({})
db.workers.deleteMany({})
db.ratings.deleteMany({})
```

## What Gets Deleted

The cleanup process removes ALL data from these collections:
- **Bookings**: All customer service bookings
- **Workers**: All registered service workers  
- **Ratings**: All customer ratings and reviews

## Safety Features

1. **Confirmation Prompt**: The command-line script requires typing "DELETE" to proceed
2. **Dry Run Option**: Use `node testClearData.js` to see counts without deleting
3. **Empty Database Check**: Script won't run if database is already empty
4. **Admin Authentication**: API endpoint requires valid admin JWT token
5. **Admin Panel Double Confirmation**: Web interface shows data counts + requires two confirmations (modal + JavaScript confirm)
6. **Visual Warnings**: Admin panel uses red styling and warning icons for dangerous operation
7. **Real-time Counts**: Admin panel fetches and displays current data counts before deletion

## Testing the Cleanup

Before running the actual cleanup, you can test with:

```bash
cd backend
node testClearData.js
```

This will show current record counts without deleting anything.

## Automating Cleanup for Testing

For automated testing, you can create a script that runs before each test:

```javascript
// test-setup.js
const { exec } = require('child_process');
exec('node backend/clearTestingData.js', (error, stdout, stderr) => {
  console.log(stdout);
});
```

## Important Notes

⚠️ **WARNING**: These operations are irreversible! All data will be permanently deleted.

- Backup important data before running cleanup
- The cleanup affects the production database if connected to the same MONGO_URI
- Consider using a separate database for testing
- Uploaded files in `backend/uploads/` are NOT deleted by these scripts

## File Upload Cleanup

If you also want to clear uploaded worker photos, manually delete files from:
```
backend/uploads/
```

## Troubleshooting

**Error: "MongoDB Error: ..."**
- Check your MONGO_URI in `.env` file
- Ensure MongoDB connection is working

**Error: "No token" or "Invalid token"**
- Make sure you're authenticated as admin
- Token may have expired (default 8 hours)

**Script hangs or doesn't respond**
- Check if MongoDB connection is established
- Ensure you have proper network connectivity

## Related Files

- `backend/clearTestingData.js` - Main cleanup script
- `backend/testClearData.js` - Test/dry-run script
- `backend/routes/admin.js` - Admin API with cleanup endpoint
- `adminsewa.html` - Admin panel with cleanup button and modal
- `backend/.env` - Database connection configuration
- `backend/CLEANUP_TESTING_DATA.md` - Documentation reference for cleanup flow
