import os

from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.providers.openai import OpenAIProvider

load_dotenv()

agent = Agent(
    OpenAIModel(os.environ.get('OPENAI_MODEL_NAME'),
            provider=OpenAIProvider(
                base_url=os.environ.get('OPENAI_API_BASE'),
                api_key=os.environ.get('OPENAI_API_KEY'),
            ),
                          ), instructions='Be fun!')
app = agent.to_ag_ui()

# Enable CORS for all origins (development only)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == '__main__':
    import uvicorn

    uvicorn.run('agent:app', port=9000)
