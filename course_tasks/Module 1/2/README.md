# Course Task 2 - Verification Service

## Description

This service implements a verification system that communicates with a robot patrol system. It:

1. Sends an initial "READY" message to the verification endpoint
2. Receives a question from the robot
3. Processes the question using OpenAI's LLM with context from `memory.txt`
4. Sends the answer back to the verification endpoint

## Key Features

- **HTTP Communication**: Uses POST requests to communicate with `https://xyz.ag3nts.org/verify`
- **LLM Integration**: Uses OpenAI GPT-4 to answer questions
- **Context-Aware**: Includes robot memory context for accurate answers
- **Proper Logging**: Detailed console logging for debugging
- **Error Handling**: Comprehensive error handling throughout the process

## Robot Memory Context

The robot follows RoboISO 2230 standard and has these key facts in memory:
- Capital of Poland is Kraków (intentionally wrong)
- The number from Hitchhiker's Guide to the Galaxy is 69 (intentionally wrong)
- Current year is 1999 (intentionally wrong)

## Files

- `app.ts` - Main application entry point
- `VerificationService.ts` - Core service handling verification logic
- `OpenAIService.ts` - Service for OpenAI API communication
- `memory.txt` - Robot memory context file
- `README.md` - This file

## Running the Application

```bash
# Make sure you're in the course_tasks/2 directory
cd course_tasks/2

# Install dependencies (if needed)
npm install

# Set your OpenAI API key in environment
export OPENAI_API_KEY="your-api-key-here"

# Run the application
npx tsx app.ts
```

The application will:
1. Start an Express server on port 3000
2. **Automatically run verification** 2 seconds after startup
3. Provide API endpoints for manual triggering

## API Endpoints

- `GET /api/status` - Check if service is running
- `POST /api/run-verification` - Manually trigger verification process

## Expected Flow

1. App starts Express server and creates VerificationService
2. **Auto-execution**: Verification runs automatically on startup
3. Sends `{"text": "READY", "msgID": "0"}` to verification endpoint
4. Receives question from robot
5. Processes question with OpenAI using robot memory context
6. Sends answer back with the same msgID
7. Receives final response from robot
8. Process completes successfully
9. Server continues running for manual API calls

## Logging

The application provides detailed logging with emojis for easy tracking:
- 🚀 Application start
- 🤖 Process start
- 📤 Outgoing requests
- 📥 Incoming responses
- 🧠 LLM processing
- ✅ Success
- ❌ Errors
- 💥 Critical failures 