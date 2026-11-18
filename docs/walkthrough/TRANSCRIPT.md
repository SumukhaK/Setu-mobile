# Setu walkthrough transcript

Relay desktop and Field Android · 07:05 · Narrated prototype using fictional accounts and simulated connections.

## Chapters

- **00:00** Overview
- **00:13** 01 / Email access
- **00:46** 02 / Phone readiness
- **01:46** 03 / Pair and attach
- **02:43** 04 / Background and recovery
- **03:10** 05 / Capture and share evidence
- **04:48** 06 / End the session
- **05:13** 07 / Managed workspaces
- **06:29** 08 / Profile and settings
- **06:54** Complete

### 00:00 · From first sign-in to a shared fix

This is the Setu walkthrough. Morgan is the developer on Relay desktop. Casey hosts a Pixel on Field for Android. These two prototypes replay the same story with sample data and simulated connections.

### 00:13 · Create an account with email

Start with Create account on each app and enter an email address. Returning users choose Sign in and follow the same verification flow.

### 00:22 · Verify the email address

Enter the six digit email code. If a code expires or does not match, edit the address or request a new code after the cooldown. This code signs you in. Device pairing comes later.

### 00:35 · Choose Solo or Corporate

Both apps offer Solo and Corporate. For this personal session, choose Solo. Corporate will use organization enrollment and a device grant, which we will walk through later.

### 00:46 · Prepare the Android phone

Field gives Casey one next step. Open All setup checks to see Wi-Fi, Developer options, and Wireless debugging. USB debugging is available for wired workflows and can stay off here.

### 00:58 · Enable Developer options

Open About phone and tap Build number seven times. On some phones, it is under Software information. The guide shows what to search for if your Settings menu is arranged differently.

### 01:10 · Return from Android Settings

After the seventh tap, return to Setu and run the readiness check again. Android may ask you to confirm the phone screen lock during setup.

### 01:19 · Turn on Wireless debugging

On a supported Android phone, join Wi-Fi, go to Developer options, and turn on Wireless debugging. Confirm the network if Android asks. Android debugger authorization is a separate prompt from Setu pairing.

### 01:33 · Start hosting and show the code

The required checks passed. Casey taps Start hosting and reads the Setu pairing code to Morgan. It expires, and Casey can renew it. The phone is now ready to receive an access request.

### 01:46 · Recover an expired pairing code

In Relay, choose Connect device and enter the code from the phone. An expired code keeps you in the form and explains how to recover. Ask Casey to renew or read the current code.

### 01:58 · Review the request on Android

Morgan submits the current code and sees Awaiting approval. Casey checks the requester and the requested access on Android. They can decline the request and still keep hosting.

### 02:08 · The encrypted tunnel is ready

After Casey approves, Setu opens an encrypted tunnel and gives Morgan a local endpoint. The ready state means the tunnel is listening. The debugger still needs to attach.

### 02:19 · Attach Android Studio or ADB

Run the copied ADB connect command on the computer. Then select the phone in Android Studio. If the command is unavailable, check Platform Tools. If Android asks you to trust the debugger, approve it on the phone.

### 02:34 · Confirm ADB is attached

Both screens now show ADB attached. Morgan can run or debug the app in the IDE, and Casey can still see who is connected and end the session.

### 02:43 · Keep the session running

Move Relay to the tray to continue working in the IDE. If Casey leaves Field, Android shows an ongoing notification from the foreground service. Either person can end the session from the background controls.

### 02:56 · Recover after a network change

On a network interruption, Setu shows Reconnecting. If automatic recovery expires, check Wi-Fi and hosting, then retry. An unavailable device stays visibly offline until the connection is restored.

### 03:10 · Give Android screen-capture consent

Open Evidence and choose Take screenshot or Record screen. Android asks whether to share one app or the entire screen each time capture begins. If Casey declines or Android hides protected content, choose a permitted capture or import an existing file.

### 03:25 · Preview the screenshot and add context

Review the image and write a short note with the action and result. A useful report says what was tapped, what happened, and where to look. Keep sensitive content out of the capture.

### 03:36 · Choose a sharing destination

Review the file name and note one more time, then choose the developer inbox or an allowed Android share destination. If sharing fails, the local draft stays available for retry.

### 03:48 · Record and stop a screen clip

Record screen follows the same consent flow. The recording indicator and Stop recording control stay available. Stop the clip, review what it contains, and share it with the same context.

### 04:00 · Import a capture you already have

Use Import media when the screenshot or clip already exists. Android’s picker opens first. The imported item follows the same preview, note, and sharing flow as a fresh capture.

### 04:12 · Import and annotate on Relay

On desktop, Evidence can import a screenshot or recording from the local machine. Open the preview, add the reproduction steps, and keep a draft or continue to share. Export saves a local copy.

### 04:25 · Share to the review folder

Choose the review folder and confirm sharing. This walkthrough uses simulated destinations. In the product, this is where an authorized upload would make the evidence available to the reviewer.

### 04:37 · Check the sharing result

The confirmation tells Morgan the evidence was shared. Casey can also see the status of their own evidence. The evidence file and note stay separate from the session audit log.

### 04:48 · Disconnect when debugging is done

Morgan opens Disconnect in the current session. Casey can also choose End session on the phone or in the notification. Ending the session closes the tunnel and releases the local ADB endpoint.

### 04:59 · Review history and stop hosting

History records the device and how the session ended. Casey can stop hosting separately so the phone stops accepting new requests. On desktop, Forget device removes a saved pairing when reuse is no longer wanted.

### 05:13 · Corporate policy locks Solo

On a managed account or phone, Solo can be locked by the organization. Both screens explain the decision. The real product must enforce it in the session service, Android host, and organization gateway.

### 05:26 · Enroll the phone and verify a grant

Corporate access requires verified membership, device enrollment, and a device grant. The phone owner can ask an administrator for help when enrollment is pending. An email address by itself grants no device access.

### 05:39 · Select an authorized corporate device

In Corporate on Relay, choose Select device and pick an enrolled phone you’ve been granted. Restricted or offline devices show a reason. In a managed deployment, these sessions travel through the organization relay.

### 05:52 · Review the audit log and export a report

Authorized users open Audit log and export the report. The report records session events and may include operation details when available. Screenshots and recordings are shared from Evidence.

### 06:04 · Recover from a missing grant or policy block

If the account lacks membership or its device grant, ask the administrator. If Android debugging is blocked by device policy, hosting stays unavailable. A revoked grant ends the existing session.

### 06:17 · Respect managed sharing rules

When a destination is blocked by corporate policy, the draft stays available. Casey can select the approved organization inbox. Personal and managed evidence live in separate workspaces.

### 06:29 · Manage account, device and access

Profile and settings show email and the current workspace. Relay exposes the tray preference and local diagnostics. Field exposes debugging readiness, foreground notifications, and remembered access.

### 06:42 · Clear trusted access or sign out

You can clear remembered access before handing the phone back. To finish, use Sign out. The product should close any active session and clear the active credentials when you leave.

### 06:54 · Setu · Relay desktop + Field Android

That completes the Setu walkthrough. The repository adds a transcript and chapter times. You can replay the journeys in the prototypes using their demo scenario menus.
