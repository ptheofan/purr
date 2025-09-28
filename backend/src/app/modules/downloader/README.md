# Downloader
This is the most complex part of the application.

## Requirements
- Can be instantiated and run concurrently multiple times.
- Each downloader represents a File
- We download (download-manager module) MULTIPLE files concurrently
- Must download files as fast as possible maximizing download speed.
- For large files (defined by config) we utilize multi-part parallel downloading
- Large files we download can easily be over 10G
- We utilize multi-part download strategy coordinated by the ranges API (see ranges class)
- We also constantly monitoring the download speed (rolling window) for each part we are fetching
- We restart connections that are below our defined thresholds for defined time intervals (coming from configuration)
