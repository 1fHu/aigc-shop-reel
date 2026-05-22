from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class ComposeRequest(BaseModel):
    # TODO: define compose request fields (video_urls, subtitles, bgm, transitions)
    pass


class ComposeResponse(BaseModel):
    task_id: str = ""


@router.post("/", response_model=ComposeResponse)
async def compose_video(request: ComposeRequest):
    # TODO: implement FFmpeg composition pipeline
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{task_id}/status")
async def get_compose_status(task_id: str):
    # TODO: return composition progress
    return {"task_id": task_id, "status": "pending"}
