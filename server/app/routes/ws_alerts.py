from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import math
from typing import Any, Dict

router = APIRouter(prefix="/api/ws", tags=["websockets"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[WebSocket, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[websocket] = {"lat": None, "lng": None, "saved_places": []}
        print(f"[WS] Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            del self.active_connections[websocket]
            print(f"[WS] Client disconnected. Total connections: {len(self.active_connections)}")

    async def update_location(self, websocket: WebSocket, lat: float, lng: float):
        if websocket not in self.active_connections:
            return
        current = self.active_connections[websocket]
        self.active_connections[websocket] = {
            "lat": lat,
            "lng": lng,
            "saved_places": current.get("saved_places", []),
        }
        print(f"[WS] Location updated: lat={lat:.4f}, lng={lng:.4f}")

    async def update_saved_places(self, websocket: WebSocket, saved_places: list[Dict[str, Any]]):
        if websocket not in self.active_connections:
            return

        normalized_places = []
        for item in saved_places or []:
            try:
                lat = float(item.get("lat"))
                lng = float(item.get("lng"))
            except (TypeError, ValueError):
                continue

            label = str(item.get("label") or "").strip() or "Saved place"
            normalized_places.append({"label": label, "lat": lat, "lng": lng})

        current = self.active_connections[websocket]
        self.active_connections[websocket] = {
            "lat": current.get("lat"),
            "lng": current.get("lng"),
            "saved_places": normalized_places[:4],
        }
        print(f"[WS] Saved places updated: {len(normalized_places[:4])}")

    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        earth_radius_km = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)

        a = (
            math.sin(dlat / 2) * math.sin(dlat / 2)
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2)
            * math.sin(dlon / 2)
        )

        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return earth_radius_km * c

    async def broadcast_proximity_alert(
        self,
        report_data: Dict[str, Any],
        radius_km: float = 5.0,
        broadcast_all: bool = False,
    ):
        report_lat = report_data.get("latitude")
        report_lng = report_data.get("longitude")
        saved_place_radius_km = 2.5

        print(
            f"[WS] Broadcasting alert: {report_data.get('crime_type')} "
            f"at ({report_lat}, {report_lng}), {len(self.active_connections)} clients connected"
        )

        if report_lat is None or report_lng is None:
            print("[WS] No lat/lng in report data, skipping broadcast")
            return

        message = {
            "type": "proximity_alert",
            "data": report_data,
        }

        disconnected = []
        for ws, coords in self.active_connections.items():
            user_lat = coords.get("lat")
            user_lng = coords.get("lng")
            saved_places = coords.get("saved_places") or []
            current_distance = None
            matched_saved_place = None

            if user_lat is not None and user_lng is not None:
                current_distance = self._calculate_distance(report_lat, report_lng, user_lat, user_lng)

            for place in saved_places:
                place_distance = self._calculate_distance(report_lat, report_lng, place["lat"], place["lng"])
                if place_distance <= saved_place_radius_km and (
                    matched_saved_place is None or place_distance < matched_saved_place["distance"]
                ):
                    matched_saved_place = {
                        "label": place["label"],
                        "distance": place_distance,
                    }

            should_send_current = current_distance is not None and current_distance <= radius_km
            should_send_saved = matched_saved_place is not None

            if not broadcast_all and not should_send_current and not should_send_saved:
                continue

            payload = dict(message)
            if current_distance is not None:
                payload["distance"] = current_distance

            if should_send_saved:
                payload["matched_place_label"] = matched_saved_place["label"]
                payload["matched_place_distance"] = matched_saved_place["distance"]
                payload["alert_scope"] = "saved_place"
            elif should_send_current:
                payload["alert_scope"] = "current_location"
            else:
                payload["alert_scope"] = "broadcast"

            try:
                await ws.send_json(payload)
                print("[WS] Alert sent to client")
            except Exception as exc:
                print(f"[WS] Failed to send to client: {exc}")
                disconnected.append(ws)

        for ws in disconnected:
            self.disconnect(ws)


manager = ConnectionManager()


@router.websocket("/alerts")
async def websocket_alerts(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                if payload.get("action") == "update_location":
                    lat = payload.get("lat")
                    lng = payload.get("lng")
                    if lat is not None and lng is not None:
                        await manager.update_location(websocket, float(lat), float(lng))
                elif payload.get("action") == "set_saved_places":
                    await manager.update_saved_places(websocket, payload.get("saved_places") or [])
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@router.get("/debug-connections")
async def debug_connections():
    clients = []
    for coords in manager.active_connections.values():
        clients.append(
            {
                "lat": coords.get("lat"),
                "lng": coords.get("lng"),
                "saved_places": coords.get("saved_places") or [],
                "has_location": coords.get("lat") is not None,
            }
        )
    return {
        "total_connections": len(manager.active_connections),
        "clients": clients,
    }


@router.get("/test-broadcast")
async def test_broadcast():
    report_data = {
        "id": 999,
        "report_id": "TEST_BROADCAST",
        "crime_type": "Test Alert",
        "severity": "high",
        "latitude": 21.1702,
        "longitude": 72.8311,
        "area_name": "Surat Test Area",
    }
    connected = len(manager.active_connections)
    await manager.broadcast_proximity_alert(report_data, radius_km=100.0)
    return {
        "status": "broadcast_sent",
        "connected_clients": connected,
        "message": "Sent test alert with 100km radius to reach all clients",
    }
