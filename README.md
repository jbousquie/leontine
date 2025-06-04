# Leontine

A modern, responsive client application for audio transcription using the WhisperX API.

## Project Goals

- Create a user-friendly interface for audio transcription services
- Implement a responsive design that works well on both desktop and mobile devices
- Support Progressive Web App (PWA) capabilities for installation on various devices
- Provide a clean, intuitive UI for uploading audio files and managing transcription settings
- Display real-time transcription status with queue position and progress indicators
- Enable easy access to transcription results with copying and downloading options
- Support various output formats (text, subtitles, JSON)
- Store user preferences for seamless experience across sessions
- Handle network connectivity issues gracefully with retry mechanisms
- Implement proper error handling and user feedback

## Features

- **Authentication Management**: Store and manage API credentials securely
- **File Upload**: Drag-and-drop or file selection interface for audio files
- **Transcription Options**: Configure language, model size, speaker diarization, and output format
- **Status Tracking**: Real-time updates on transcription progress and queue position
- **Result Management**: Copy to clipboard and download transcription results
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Offline Capabilities**: PWA support for installation and basic offline functionality
- **Persistent Settings**: Save user preferences between sessions
- **Clear Notifications**: Contextual feedback for user actions

## Installation

1. Clone this repository
2. Load `index.html` in a web browser from a local server or HTTPS
3. Configure the API URL and authentication token
4. Start transcribing audio files

## Usage

1. Set your API URL and authentication token in the settings section
2. Upload an audio file by dragging and dropping or using the file selector
3. Configure transcription options (language, model, etc.)
4. Click "Transcribe Audio" and monitor the progress
5. When complete, view, copy, or download your transcription

## Development

Leontine is built with pure HTML, CSS, and JavaScript without external dependencies, making it easy to extend and maintain.

## WhisperX API

Leontine is designed to work with the WhisperX API, which provides powerful audio transcription services with features like:

- Multi-language support
- Speaker diarization
- Various output formats
- Queueing system for handling multiple requests

For more information about the API, see the [WhisperX API repository](https://github.com/jbousquie/whisper_api).

## License

[MIT License](LICENSE)
