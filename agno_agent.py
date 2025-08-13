import os

from agno.agent.agent import Agent
from agno.models.openai import OpenAIChat
from agno.storage.sqlite import SqliteStorage
from agno.app.agui import AGUIApp
from agno.tools import tool
from agno.app.settings import APIAppSettings
from dotenv import load_dotenv
load_dotenv()

storage = SqliteStorage(table_name="sessions")


@tool(
    description="Generates a random number between min and max (inclusive).",
    name="random_number",
    show_result=True,
)
def random_number(agent: Agent, min: int = 1, max: int = 100):
    import random
    agent.session_state["state"]="rnd before"
    num = random.randint(min, max)
    agent.session_state["state"] = "rnd after"
    return num

@tool(
    description="Waits for a number of seconds",
    name="wait",
    # show_result=True,
    # requires_user_input=True,
)
def wait(agent: Agent, seconds: int):
    import time

    agent.session_state["state"]="wait before"
    time.sleep(seconds)
    agent.session_state["state"] = "wait after"

# class AnswerWithReason(BaseModel):
#     reason: str = Field(description="Reason for answer")
#     answer: str = Field(description="Answer for the question")

agent = Agent(
    name="Assistant",
    model=OpenAIChat(api_key=os.environ["OPENAI_API_KEY"], base_url=os.environ["OPENAI_API_BASE"],
                     id=os.environ["OPENAI_MODEL_NAME"]),
    add_datetime_to_instructions=True,
    markdown=True,
    # add_history_to_messages=True,
    # num_history_runs=5,
    # read_chat_history=True,
    # storage=storage,
    show_tool_calls=True,
    # reasoning=True,
    stream_intermediate_steps=True,
    stream=True,
    # response_model=AnswerWithReason,
    debug_mode=True,
    # tools=[ThinkingTools(add_instructions=True)]
    tools=[
        random_number, wait
    ],
    description="Answer the question",
    instructions="You have access to two tools:"
                 "\n   1. wait: Wait for a given number of seconds"
                 "\n   2. random_number: Get a random number between specified min and max values",
)

agui_app = AGUIApp(
    agent=agent,
    name="Test App",
    app_id="test",
    settings=APIAppSettings(
        docs_enabled=True,
        title="Test App"
    )
)

app = agui_app.get_app()

if __name__ == "__main__":
    agui_app.serve(app="agno_agent:app", port=9000, reload=True)
    # agent.cli_app()

