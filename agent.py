import os
from dataclasses import dataclass, field

from typing import Any

from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pydantic_ai import Agent, Tool
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.providers.openai import OpenAIProvider

load_dotenv()


@dataclass
class StateHandler:
    state: dict[str, Any] = field(default_factory=dict)


def wait(seconds: int):
    import time

    time.sleep(seconds)
    return f"waited for {seconds} seconds"


def random_number(min: int, max: int):
    import random

    return random.randint(min, max)


agent = Agent(
    OpenAIModel(
        os.environ.get("OPENAI_MODEL_NAME"),
        provider=OpenAIProvider(
            base_url=os.environ.get("OPENAI_API_BASE"),
            api_key=os.environ.get("OPENAI_API_KEY"),
        ),
    ),
    instructions="Be fun! You have access to two tools:"
    "\n   1. wait: Wait for a given number of seconds"
    "\n   2. random_number: Get a random number between specified min and max values",
    tools=[
        Tool(
            wait,
            name="wait",
            description="Wait for a given number of seconds",
            takes_ctx=False,
        ),
        Tool(
            random_number,
            name="random_number",
            description="Get a random number",
            takes_ctx=False,
        ),
    ],
    deps_type=StateHandler,
)
app = agent.to_ag_ui(deps=StateHandler())

# Enable CORS for all origins (development only)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("agent:app", port=9000)
