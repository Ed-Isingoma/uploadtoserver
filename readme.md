
# uploadtoserver

A simple Node.js server for uploading files to a server.

## What it does

* Provides an HTTP endpoint to accept file uploads.
* Serves a basic web interface (or form) to upload files via browser or API.
* Saves uploaded files on the server.
* Enables download of uploaded files from the server.

## How to use

### Prerequisites

* Node.js installed.
* (Optional) Configure destination folder / permissions where uploads will be stored.

### Installation & run

```
git clone https://github.com/Ed-Isingoma/uploadtoserver.git
cd uploadtoserver
npm install
node server.js
```

### Uploading files

* Open your browser and navigate to the server’s address (e.g. `http://localhost:3000` or appropriate port) to use the upload form.


### Default config

* The server reads configuration (if any) from `package.json` or internal defaults.
* Uploaded files are stored in a folder relative to where `server.js` runs.

## Notes & limitations

* Minimal dependencies — good for quick file uploads or testing.
* No advanced features (auth, large-file chunking, resumable uploads) — use only in trusted or internal environments.
* Not production hardened: no rate-limiting, no security hardening, no HTTPS out of the box.
