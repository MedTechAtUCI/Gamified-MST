# Gamified Mnemonic Similarity Task (Gamified-MST)

An enhanced, gamified version of the **Mnemonic Similarity Task (MST)**, hosted at [mst.medtech-uci.com](http://mst.medtech-uci.com/). This repository provides both a **Gamified** version (incorporating rich visual themes, interactive dialogue, and progression levels) and the **Original MST (oMST)** (a clean, traditional neuropsychological test variant). 

The application is built on **Next.js (React + TypeScript)** integrated with **jsPsych**, communicating with a **Serverless AWS Backend** (managed via **Terraform**) to persist participant metrics and track experimental states.

---

## Core Task & Neuropsychological Metrics

The **Mnemonic Similarity Task (MST)** is a widely recognized cognitive paradigm designed to evaluate visual recognition memory and pattern separation. Participants are presented with an image sequence containing three stimulus types:
1. **Targets (Repeats)**: Images identical to previously seen ones.
2. **Lures (Similar)**: Images that are highly similar but not identical to previously seen ones.
3. **Foils (Novel/New)**: Entirely new images.

Participants categorize each image as **"Old"**, **"Similar"**, or **"New"**. 

Using these categorizations, the backend analytics pipeline calculates two primary neurological metrics:
- **Recognition Memory (REC)**: Measures basic recognition strength.
  $$\text{REC} = P(\text{"Old"} \mid \text{Repeats}) - P(\text{"Old"} \mid \text{Foils})$$
- **Lure Discrimination Index (LDI)**: Measures pattern separation performance (the ability to distinguish similar lures from exact repeats).
  $$\text{LDI} = P(\text{"Similar"} \mid \text{Lures}) - P(\text{"Similar"} \mid \text{Foils})$$

---

## Application Variants & URL Routing

The platform serves two parallel tracks on different subroutes:

### 1. Gamified MST (`/gamified-mst/`)
* **Objective**: Increases participant retention and engagement in longitudinal/multi-session studies.
* **Aesthetics**: Fully themed visual interface featuring custom character illustrations ("Peter Anteater"), immersive dialogue elements, game weeks, levels, custom progress indicators, and rich visual feedback.

### 2. Original MST (`/omst/`)
* **Objective**: Provides a highly standardized, traditional clinical testing environment with minimal aesthetic distractions.
* **Aesthetics**: Clean, classic layout styled with neutral colors. Concentrates purely on the cognitive task and rapid stimulus presentation.

---

## Architecture & Tech Stack

### Frontend
- **Framework**: Next.js (React + TypeScript)
- **Experimental Engine**: jsPsych (integrated for trial stimulus presentation and response collection)
- **Hosting / Delivery**: Static site build deployed via GitHub Pages

### Backend & Infrastructure
- **API Layer**: AWS API Gateway
- **Compute**: AWS Lambda (serverless functions handling metric ingestion and transformations)
- **Database**: AWS DynamoDB (storing participant session states and per-trial metrics)
- **Storage & CDN**: AWS S3 (image stimulus repository) paired with AWS CloudFront
- **Infrastructure as Code (IaC)**: Terraform


## Query Parameters & Flow Lifecycle

Both routes expect query parameters passed directly from participant recruitment platforms (e.g., **Prolific**):

```
https://mst.medtech-uci.com/gamified-mst/?PROLIFIC_PID=xxx&SESSION_ID=xxx&STUDY_ID=xxx
```

### Participant Journey & Flow:
1. **Landing & Initialization**:
   * Inspects `PROLIFIC_PID`, `SESSION_ID`, and `STUDY_ID`. If missing, encourages the participant to access the task via Prolific.
   * If `test=true` is passed as a query param, enables development bypass features allowing testers to manually inputs demographics and run without live DB requirements.
2. **Consent Screening**:
   * Participants are routed to `/consent/` to read the consent forms.
   * On consent confirmation: redirects to the respective variant page appending `consented=true`.
   * On consent refusal: redirects to the fallback URL configured under `NEXT_PUBLIC_PROLIFIC_NO_CONSENT`.
3. **Database Pull & State Handshake**:
   * Contacts the AWS API `GET /state` to check if the participant already has completed runs.
   * Evaluates their state. There are **5 unique image sets**. The algorithm assigns the next uncompleted set.
   * If the participant completed all 5 sessions, they are immediately redirected to the Prolific completion landing page.
4. **Task Execution**:
   * Visual files are pre-cached through CloudFront.
   * The participant completes the cognitive task.
5. **Data Submission**:
   * At the completion of the experiment, a batch payload is sent via `POST /metrics` to write all trials.
   * Redirects the user to the `NEXT_PUBLIC_PROLIFIC_COMPLETE_STUDY` URL.

---

## Data Models & API Schema

### GET `/state`
Retrieves or registers participant progress tracking data (sessions).

* **Parameters**:
  * `userId` (String): Prolific Participant ID.
  * `sessionId` (String): Prolific Session ID.
* **Sample Response `200 OK`**:
  ```json
  {
    "userId": "PROLIFIC_PID_XYZ",
    "sessionId": "SESSION_ID_XYZ",
    "participant_age": 25,
    "participant_gender": "Male",
    "participant_ethnicity": "Non-Hispanic",
    "participant_race": "Asian",
    "participant_handedness": "Right",
    "sessions": [
      {
        "sessionId": "SESSION_1",
        "set_number": 2,
        "completed": true
      }
    ],
    "game_set": 3
  }
  ```

---

### POST `/metrics`
Batches trial records and registers completion metadata (per-session metrics).

* **Sample Payload**:
  ```json
  {
    "user_id": "PROLIFIC_PID_XYZ",
    "session_id": "SESSION_ID_XYZ",
    "current_level": 1,
    "game_week": 2,
    "set": 3,
    "session_completed": true,
    "game_type": "G",
    "participant_age": 25,
    "participant_gender": "Male",
    "participant_ethnicity": "Non-Hispanic",
    "participant_race": "Asian",
    "participant_handedness": "Right",
    "screen_size": "1920x1080",
    "device_type": "Desktop",
    "trials": [
      {
        "trial_id": "1",
        "image_id": "Set3/img001.jpg",
        "trial_type": "image-button-response",
        "mst_type": "3",
        "lag": "12",
        "lure_bin": "2",
        "participant_response": "Similar",
        "correct_resp": "1",
        "correct": true,
        "reaction_time_ms": 1102,
        "timestamp": "2026-06-09T12:00:00.000Z"
      }
    ]
  }
  ```

---

## CI/CD & Deployment Workflow

The project uses GitHub Actions (`.github/workflows/deploy.yaml`) to automate web publication:
1. **Trigger**: Any pushes to the `main` branch containing changes to `gamified-mst/` files or the workflow itself.
2. **Build Stage**: Sets up Node, injects secrets into the environment variables, installs project packages, and compiles the Next.js static build (`out/` output folder).
3. **Deploy Stage**: Pushes the compiled `out/` folder to a designated production deployment branch (`Website_Deployment`) in the repository, making it live instantly at `mst.medtech-uci.com` under GitHub Pages.
