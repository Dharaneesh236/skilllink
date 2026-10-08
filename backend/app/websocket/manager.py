"""WebSocket Connection Manager for Real-Time Event Dispatching"""

import json
from typing import Dict, List, Any, Optional
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Maps user_id -> List[WebSocket] (a user may have multiple tabs open)
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_event(self, user_id: int, event_type: str, data: Any):
        """Sends an event specifically to all connections of a particular user."""
        if user_id in self.active_connections:
            payload = json.dumps({"type": event_type, "data": data})
            dead_connections = []
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead_connections.append(ws)
            for dead in dead_connections:
                self.disconnect(dead, user_id)

    async def send_to_users(self, user_ids: List[int], event_type: str, data: Any):
        """Sends an event to a specified list of user IDs."""
        for uid in user_ids:
            await self.send_personal_event(uid, event_type, data)

    async def broadcast(self, event_type: str, data: Any, exclude_user_id: Optional[int] = None):
        """Broadcasts an event to all connected users."""
        payload = json.dumps({"type": event_type, "data": data})
        for user_id, sockets in list(self.active_connections.items()):
            if exclude_user_id and user_id == exclude_user_id:
                continue
            dead_connections = []
            for ws in sockets:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead_connections.append(ws)
            for dead in dead_connections:
                self.disconnect(dead, user_id)


manager = ConnectionManager()
