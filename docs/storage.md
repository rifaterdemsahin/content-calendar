# Storage and network drives

## Synology NAS (home network)

- **Name on the network:** `PLEX` (Bonjour: `PLEX.local`). Confirmed by the owner.
- **Address:** `192.168.1.242` at the time of writing. Use the name `PLEX.local` where possible, because the address can change when the router reassigns it.
- **Model and software:** a Synology NAS running DSM. The DSM web API answers on ports 5000 (HTTP) and 5001 (HTTPS). Plex may run on it too, which is why it advertises the name `PLEX`.
- **Ports seen open:** 445 (SMB file sharing), 5000 and 5001 (DSM).
- **Login:** none stored in this repo. Connect in Finder with *Go → Connect to Server* (`smb://PLEX.local`) and sign in with your own account. Mount the share read-write only when copying.
- **Never** store the NAS password, a DSM token or an API key in this repo, in a script, or in a chat message.

## Google Drive

- Shared folder: "pexabo shared folders" (the owner's Google Drive).
- Uploads: use the Drive connector to create or update files in that folder. Make a link public only for finished videos that the owner has approved.
- **Never** upload API keys, passwords or `.env` files to Drive, and never make them public. A public link to a key lets anyone use it.

## Keys

- API keys stay in the environment (`DEEPINFRA_API_KEY`) or in Azure Key Vault, as in AGENTS.md section 10.
- If a key is pasted into chat or copied anywhere it shouldn't be, rotate it at the provider and set the new one.
