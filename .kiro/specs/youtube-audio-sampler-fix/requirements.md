# Requirements Document

## Introduction

The YouTube Audio Sampler system needs to work with YouTube's iframe API to create timestamp-based samples without downloading audio. Users should be able to load YouTube videos, play them normally through the YouTube player, and create samples by pressing keys at specific timestamps. The system will store these timestamps and allow users to jump between them instantly, creating an MPC-style sampling experience that works within YouTube's terms of service.

## Requirements

### Requirement 1

**User Story:** As a music producer, I want to load a YouTube video and create timestamp-based samples while it plays, so that I can quickly sample different parts of the track.

#### Acceptance Criteria

1. WHEN a user pastes a YouTube URL and clicks "Load Video" THEN the system SHALL load the video player using YouTube's iframe API
2. WHEN the video loads successfully THEN the system SHALL display the video player and enable sample timestamp controls
3. WHEN the user plays the video THEN the system SHALL track playback position and allow real-time sample creation
4. WHEN the user presses a pad key THEN the system SHALL create a timestamp-based sample at the current playback position
5. IF the video fails to load THEN the system SHALL display a clear error message and allow retry

### Requirement 2

**User Story:** As a music producer, I want to create and instantly jump to sample timestamps using keyboard pads, so that I can quickly navigate between different parts of a track like an MPC sampler.

#### Acceptance Criteria

1. WHEN a user presses a pad key and no timestamp exists THEN the system SHALL create a new sample timestamp at the current playback position, but allow the clip/video to keep playing
2. WHEN a user presses a pad key and a timestamp already exists THEN the system SHALL instantly jump to that timestamp and continue playing
3. WHEN jumping between timestamps THEN the audio SHALL maintain continuous playback without pausing or reloading
4. WHEN creating or jumping to timestamps THEN the system SHALL provide immediate audio feedback with no perceptible delay

### Requirement 3

**User Story:** As a music producer, I want to edit sample timestamps manually, so that I can fine-tune the exact timing of my samples for precision.

#### Acceptance Criteria

1. WHEN a user selects a timestamp THEN the system SHALL allow manual editing of the time value
2. WHEN a timestamp is edited THEN the system SHALL update the pad mapping immediately
3. WHEN a timestamp is shifted backward or forward THEN the system SHALL validate the new position is within the audio duration
4. WHEN timestamp changes are saved THEN the system SHALL persist the changes for the current session


### Requirement 4

**User Story:** As a music producer, I want to see a waveform visualization of the loaded audio, so that I can visually identify song structure and optimal sampling points.

#### Acceptance Criteria

1. WHEN audio is successfully loaded THEN the system SHALL generate and display a waveform visualization beneath the video
2. WHEN the audio plays THEN the waveform SHALL show a progress indicator that moves in sync with playback
3. WHEN the user creates timestamps THEN the waveform SHALL display visual markers at those positions
4. WHEN the waveform is displayed THEN it SHALL provide visual cues for song structure like intros, choruses, and build-ups

### Requirement 5

**User Story:** As a music producer, I want reliable sample storage and playback, so that I can work with my created samples without losing data.

#### Acceptance Criteria

1. WHEN samples are created THEN the system SHALL store sample timestamps and metadata in browser storage
2. WHEN samples are triggered THEN the system SHALL instantly jump to the stored timestamp position
3. WHEN the browser session ends THEN the system SHALL preserve sample data for the current session
4. WHEN sample playback fails THEN the system SHALL provide fallback options and clear error messaging

### Requirement 6

**User Story:** As a music producer, I want visual feedback during video playback, so that I can see the current position and created samples.

#### Acceptance Criteria

1. WHEN the video is playing THEN the system SHALL display current playback time and progress
2. WHEN samples are created THEN the system SHALL show visual markers indicating sample positions
3. WHEN the user hovers over sample markers THEN the system SHALL display sample details and timestamps
4. WHEN the user clicks on sample markers THEN the system SHALL jump to that timestamp in the video

### Requirement 7

**User Story:** As a music producer, I want seamless audio playback when switching between samples, so that my creative flow isn't interrupted by technical glitches.

#### Acceptance Criteria

1. WHEN switching between timestamps THEN the audio SHALL continue playing without gaps or stutters
2. WHEN multiple rapid timestamp jumps occur THEN the system SHALL handle them smoothly without audio artifacts
3. WHEN audio is playing and a timestamp is triggered THEN the transition SHALL be instantaneous
4. WHEN the system is under load THEN audio playback SHALL remain the highest priority to maintain smooth operation