# Leontine

A modern, responsive client application for audio transcription using the WhisperX API.

## Project Goals

- Create a user-friendly interface for audio transcription services
- Implement a responsive design that works well on both desktop and mobile devices
- Support Progressive Web App (PWA) capabilities for installation on various devices
- Provide a clean, intuitive UI for uploading audio files and managing transcription settings
- **Display real-time transcription status with queue position and visual progress indicators**
- **Enable easy access to transcription results with copying and downloading options**
- Support various output formats (text, subtitles, JSON)
- **Store user preferences for seamless experience across sessions**
- **Persist transcription jobs across browser sessions**
- **Visual processing indicators** for active transcription jobs
- Handle network connectivity issues gracefully with retry mechanisms
- Implement proper error handling and user feedback

## Features

- **Authentication Management**: Store and manage API credentials securely
- **File Upload**: Drag-and-drop or file selection interface for audio files
- **Transcription Options**: Configure language, model size, speaker diarization, and output format
- **Status Tracking**: Real-time updates on transcription progress, queue position, and API queue state
- **Result Management**: Download transcription results as text files
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Offline Capabilities**: PWA support for installation and basic offline functionality
- **Persistent Settings**: Save user preferences between sessions
- **Job Persistence**: Resume transcription jobs after browser restart or page reload
- **Enhanced Visual Indicators**: Large animated hourglass next to section headings and animated dots for status updates
- **Clear Notifications**: Contextual feedback for user actions

## Installation

1. Clone this repository
2. Load `index.html` in a web browser from a local server or HTTPS
3. Configure the API URL and authentication token
4. Start transcribing audio files

## Usage

1. Set your API URL and authentication token in the settings section
2. The application will check the API status and display server queue information
3. Upload an audio file by dragging and dropping or using the file selector
4. Configure transcription options (language, model, etc.)
5. Click "Transcribe Audio" and monitor the progress
6. When complete, download your transcription as a text file
7. If you close the browser during transcription, the job will automatically resume when you return to the application
8. Enhanced visual indicators (large animated hourglass and animated status dots) clearly show when a transcription job is actively processing

## Development

Leontine is built with pure HTML, CSS, and JavaScript without external dependencies, making it easy to extend and maintain.

## WhisperX API

Leontine is designed to work with the WhisperX API, which provides powerful audio transcription services with features like:

- Multi-language support
- Speaker diarization
- Various output formats
- Queueing system for handling multiple requests
- Status endpoint for monitoring API health and queue state

For more information about the API, see the [WhisperX API repository](https://github.com/jbousquie/whisper_api).

## License

[MIT License](LICENSE)
