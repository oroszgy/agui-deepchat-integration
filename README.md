# AG-UI DeepChat Integration PoC

A proof-of-concept demonstrating the integration between [AG-UI](https://github.com/pydantic/pydantic-ai) and [DeepChat](https://deepchat.dev/), featuring an intelligent agent backend powered by OpenAI and a modern Vue.js frontend.

## 🏗️ Architecture

This project consists of two main components:

- **Backend Agent** (`agent.py`): A Python-based AI agent using PydanticAI with OpenAI integration
- **Frontend UI** (`ui/`): A Vue.js + TypeScript chat interface using DeepChat components

The agent provides two demonstration tools:
- `wait`: Simulates time-consuming operations
- `random_number`: Generates random numbers within specified ranges

## 🚀 Features

- **Real-time Chat Interface**: Modern chat UI with message history
- **AI Agent Integration**: Seamless connection between frontend and PydanticAI backend
- **Tool Execution**: Interactive demonstration of agent tool capabilities
- **TypeScript Support**: Full type safety in the frontend

## 📋 Prerequisites

Ensure you have the following installed:

- [Python 3.13+](https://www.python.org/)
- [Node.js](https://nodejs.org/) and npm
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- OpenAI API access (or compatible API endpoint)

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL_NAME=gpt-4  # or your preferred model
OPENAI_API_BASE=https://api.openai.com/v1  # or your custom endpoint
```

### Optional Configuration

The agent runs on port `9000` by default. You can modify this in `agent.py` if needed.

## 🛠️ Installation

### 1. Install Python Dependencies

```bash
uv sync
```

### 2. Install JavaScript Dependencies

Navigate to the UI directory and install dependencies:

```bash
cd ui
npm install
cd ..
```

## 🚀 Usage

### Start the Backend Agent

Launch the Python agent server:

```bash
uv run python ./agent.py
```

The agent will start on `http://localhost:9000` and provide:
- Agent endpoint for chat interactions
- CORS-enabled API for frontend communication
- Tool execution capabilities

### Start the Frontend UI

In a separate terminal, start the UI development server:

```bash
cd ui
npm run serve
```

The UI will be available at the address shown in the terminal output (typically `http://localhost:1234`).

## 🎯 How to Use

1. Open the frontend URL in your browser
2. Start chatting with the AI agent
3. Try asking the agent to:
   - Wait for a few seconds: *"Please wait for 3 seconds"*
   - Generate random numbers: *"Give me a random number between 1 and 100"*
   - Combine operations: *"Generate a random number, then wait for that many seconds"*

