# Firebase Emulator Setup Guide

## Why You Need This
The app is trying to download audio from YouTube using a Firebase Cloud Function, but the emulator isn't running properly. This causes the `net::ERR_CONNECTION_REFUSED` error you saw.

## Step-by-Step Setup

### 1. Stop Any Running Emulators
First, make sure no other Firebase emulators are running:
- Close any browser tabs with Firebase emulator UI
- Press `Ctrl+C` in any terminal windows running Firebase emulators

### 2. Check Port Availability
The emulator needs port 5001. Check if something else is using it:
```powershell
netstat -ano | findstr :5001
```
If something is using port 5001, either:
- Stop that process, OR
- Change the port in `firebase.json` (see step 4)

### 3. Install Function Dependencies
```powershell
cd functions
npm install
cd ..
```

### 4. (Optional) Change Port if 5001 is Busy
If port 5001 is taken, edit `firebase.json`:
```json
{
  "functions": {
    "source": "functions"
  },
  "emulators": {
    "functions": {
      "port": 5002
    },
    "ui": {
      "enabled": true
    }
  }
}
```

### 5. Start the Emulator
```powershell
npx firebase emulators:start --only functions
```

### 6. What to Look For
You should see output like:
```
✔  functions: Using node@18 from host.
✔  functions: Loaded functions definitions from source: getAudioStream.
✔  functions: functions emulator started at http://127.0.0.1:5001
```

### 7. Test the Setup
1. Keep the emulator running in one terminal
2. In another terminal, start your app: `npm run dev`
3. Try downloading audio from a YouTube video
4. You should see logs in the emulator terminal when audio downloads

### 8. Emulator UI (Optional)
- The Firebase UI should be available at `http://localhost:4000` (or 4001 if 4000 is busy)
- You can view function logs and test the function directly from the UI

## Troubleshooting

### "Port taken" Error
- Change the port in `firebase.json` to an available port (5002, 5003, etc.)
- Update the port in your app if needed (check `AudioProcessingService.js`)

### "Authentication" Warning
- This warning is normal for local development
- The function will still work without authentication

### Function Not Loading
- Make sure you're in the project root directory
- Check that `functions/index.js` exists
- Run `npm install` in the functions directory

### Still Getting Connection Refused
1. Verify the emulator is running on the correct port
2. Check your browser's developer console for the exact URL being called
3. Make sure the URL matches the emulator's address

## Success Indicators
✅ Emulator starts without errors  
✅ You see "functions emulator started at http://127.0.0.1:5001"  
✅ Audio downloads work in your app  
✅ You see function logs when downloading audio  

## Keep Running
Leave the emulator running while developing. You can stop it with `Ctrl+C` when done.