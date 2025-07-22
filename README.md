# AG-UI DeepChat integration PoC

## Prerequisites

- [Python](https://www.python.org/) installed
- [Node.js](https://nodejs.org/) and npm installed
- [uv](https://github.com/astral-sh/uv) (Python package manager)

## Installation

Install Python dependencies:

```bash
uv sync
```

Install JavaScript dependencies:

```bash
npm install
```

## Usage

### Run the Agent

Start the Python agent:

```bash
uv run python ./agent.py
```

### Serve the UI

Start the UI development server:

```bash
npm run serve
```

The UI will be available at the address shown in the terminal output.
