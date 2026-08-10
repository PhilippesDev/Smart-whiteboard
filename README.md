# Smart Whiteboard

A WebSocket-based whiteboard application that allows you to draw on your mobile device and see the results on your PC screen in real-time.

## Network Requirements
- The PC and mobile device must be on the same local network.
- Ports 80 (HTTP) and 8080 (WebSocket) must be open on the host machine.

## Installation Instructions

1. **Install PHP**: Make sure you have PHP 7.4+ installed and added to your system PATH.
2. **Install Composer**: Download and install Composer from [getcomposer.org](https://getcomposer.org/download/).
3. **Install Dependencies**: Open a terminal in the project root directory and run:
   ```bash
   composer install
   ```

## Starting the Server

1. Run the included batch file `start.bat` by double-clicking it, or from the terminal:
   ```bash
   start.bat
   ```
2. Alternatively, you can start the WebSocket server manually:
   ```bash
   php bin/server.php
   ```

## Usage

- **PC**: Open `public/pc.html` in your web browser (preferably through a local web server, e.g., `http://localhost/Smart-whiteboard/public/pc.html`).
- **Mobile**: Scan the QR code displayed on the PC screen or navigate to `public/mobile.html` using the PC's local IP address.
