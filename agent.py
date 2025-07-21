import asyncio
import os

from dotenv import load_dotenv
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.providers.openai import OpenAIProvider

load_dotenv()

agent = Agent(
    OpenAIModel('anthropic.claude-3-haiku-20240307-v1:0',
            provider=OpenAIProvider(
                base_url=os.environ.get('OPENAI_API_BASE'),
                api_key=os.environ.get('OPENAI_API_KEY'),
            ),
                          ), instructions='Be fun!')
app = agent.to_ag_ui()


if __name__ == '__main__':
    print(asyncio.run(agent.run("How are you?")).output)
    import uvicorn

    uvicorn.run('agent:app', port=9000)
