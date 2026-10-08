"""WebSocket endpoint with JWT token verification"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.auth.jwt import decode_access_token
from app.websocket.manager import manager

router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        await websocket.close(code=1008)  # Policy violation / unauthorized
        return

    user_id = int(payload["sub"])
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep socket alive and respond to client heartbeats / ping
            text = await websocket.receive_text()
            if text == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception:
        manager.disconnect(websocket, user_id)
