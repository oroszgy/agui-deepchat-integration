from dotenv import load_dotenv
from pydantic_ai import Agent

load_dotenv()

agent = Agent('openai:anthropic.claude-3-haiku-20240307-v1:0', instructions='Be fun!')
app = agent.to_ag_ui()


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('agent:app', port=9000)