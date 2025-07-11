# Leontine

A modern, responsive client application for audio transcription using the WhisperX API.

## Project Goals

- Create a user-friendly interface for audio transcription services
- Implement a responsive design that works well on both desktop and mobile devices
- Support Progressive Web App (PWA) capabilities for installation on various devices
- Provide a clean, intuitive UI for uploading audio files and managing transcription settings
- Display real-time transcription status with queue position and visual progress indicators
- Enable easy access to transcription results with downloading options
- Store user preferences for seamless experience across sessions
- Persist transcription jobs across browser sessions

## Features

- **Authentication Management**: Store and manage API credentials securely.
- **File Upload**: Simple file selection interface for audio files.
- **Status Tracking**: Real-time updates on transcription progress and queue position.
- **Result Management**: Download transcription results as text files.
- **Responsive Design**: Works on desktop, tablet, and mobile devices.
- **Offline Capabilities**: PWA support for installation and basic offline functionality.
- **Job Persistence**: Resume transcription jobs after browser restart or page reload.
- **Enhanced Visual Indicators**: Animated hourglass and status messages to clearly show when a job is processing.

## Installation

1.  Clone this repository.
2.  Serve the project from a local web server to enable PWA features and avoid CORS issues.
3.  Load `index.html` in your browser.

## Usage

1.  Set your WhisperX API URL in the settings section and save it. The app will check the API status.
2.  Select an audio file using the file selector.
3.  Click "Transcribe Audio" and monitor the progress.
4.  When complete, download your transcription as a text file.
5.  If you close the browser during transcription, the job will automatically resume when you return to the application.

## Development

Leontine is built with pure HTML, CSS, and JavaScript, without any external frameworks. It follows a predictable, state-driven **Elm-like architecture** to ensure the application is maintainable and easy to debug.

### Core Architecture

The application operates on a simple, unidirectional data flow:

**Event -> Dispatch -> Update State -> Render**

1.  An **Event** (like a button click or an API response) occurs.
2.  An **Action** is **dispatched** to a central hub (`dispatch` function in `main.js`).
3.  A pure `update` function in `state.js` takes the current state and the action, and returns a **new state**.
4.  A `render` function in `render.js` takes the new state and updates the UI to match it.

All "impure" operations, like API calls, timers, and `localStorage`, are handled as **side effects** in `main.js`, keeping the state and rendering logic clean and predictable.

### File Structure

The JavaScript source is organized into modules with distinct responsibilities:

```
leontine/
├── index.html          # Main HTML entry point
├── style.css           # Static structural and visual styles
├── reactive.css        # Dynamic styles for state changes and animations
├── manifest.json       # PWA manifest file
├── sw.js               # Service worker for offline functionality
└── js/
    ├── conf.js         # Global configuration and constants.
    ├── ui.js           # Caches DOM element references on startup.
    ├── api.js          # A stateless library for all network requests.
    ├── state.js        # Defines the application state shape and the pure `update` function.
    ├── render.js       # Handles all DOM manipulation based on the current state.
    └── main.js         # The central orchestrator: initializes the app, handles side effects, and runs the main dispatch loop.
```

## WhisperX API

Leontine is designed to work with the WhisperX API, which provides powerful audio transcription services. For more information about the API, see the [WhisperX API repository](https://github.com/jbousquie/whisper_api).

## License

[MIT License](LICENSE)