"""Geocoding and Reverse Geocoding Proxy adhering to OSM/Nominatim/Photon Policies"""

import time
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
import httpx

from app.database import get_db
from app.models import GeocodeCache
from app.schemas import GeocodeSuggestion
from app.config import settings

router = APIRouter(prefix="/geocode", tags=["Geocoding"])

# Simple in-process rate limiter for Nominatim (max 1 req per 1.1 second)
last_nominatim_request_time = 0.0
nominatim_lock = asyncio.Lock()


@router.get("/search", response_model=List[GeocodeSuggestion])
async def search_places(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db)
):
    """
    Search-as-you-type using Photon (photon.komoot.io) with local caching.
    Complies with free usage policy and provides instant autocomplete.
    """
    query_norm = q.strip().lower()
    cache_key = f"photon:{query_norm}"

    # Check cache
    cached = db.query(GeocodeCache).filter(GeocodeCache.query_key == cache_key).first()
    if cached:
        return [GeocodeSuggestion(**item) for item in cached.result_json]

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                "https://photon.komoot.io/api/",
                params={"q": query_norm, "limit": 6}
            )
            if resp.status_code == 200:
                data = resp.json()
                results = []
                for feature in data.get("features", []):
                    props = feature.get("properties", {})
                    coords = feature.get("geometry", {}).get("coordinates", [])
                    if len(coords) >= 2:
                        lng, lat = coords[0], coords[1]
                        name = props.get("name", "")
                        city = props.get("city") or props.get("town") or props.get("village", "")
                        state = props.get("state", "")
                        country = props.get("country", "")
                        parts = [p for p in [name, city, state, country] if p]
                        formatted = ", ".join(parts) if parts else name
                        results.append({
                            "name": name or formatted,
                            "formatted": formatted,
                            "lat": round(lat, 6),
                            "lng": round(lng, 6)
                        })

                if results:
                    cache_entry = GeocodeCache(query_key=cache_key, result_json=results)
                    db.add(cache_entry)
                    db.commit()

                return [GeocodeSuggestion(**r) for r in results]
    except Exception:
        pass

    return []


@router.get("/reverse", response_model=Optional[GeocodeSuggestion])
async def reverse_geocode(
    lat: float = Query(...),
    lng: float = Query(...),
    db: Session = Depends(get_db)
):
    """
    Reverse geocoding (lat, lng -> address) using OpenStreetMap Nominatim.
    Strictly complies with Nominatim policy: custom User-Agent, <= 1 req/sec, and caching.
    """
    cache_key = f"nominatim_rev:{round(lat, 4)},{round(lng, 4)}"
    cached = db.query(GeocodeCache).filter(GeocodeCache.query_key == cache_key).first()
    if cached:
        return GeocodeSuggestion(**cached.result_json)

    global last_nominatim_request_time

    async with nominatim_lock:
        now = time.time()
        elapsed = now - last_nominatim_request_time
        if elapsed < 1.1:
            await asyncio.sleep(1.1 - elapsed)
        last_nominatim_request_time = time.time()

        try:
            headers = {"User-Agent": settings.NOMINATIM_USER_AGENT}
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    "https://nominatim.openstreetmap.org/reverse",
                    params={"lat": lat, "lon": lng, "format": "json"},
                    headers=headers
                )
                if resp.status_code == 200:
                    data = resp.json()
                    display_name = data.get("display_name", "")
                    if display_name:
                        # Shorten if too long
                        parts = display_name.split(", ")
                        short_name = ", ".join(parts[:3])
                        result = {
                            "name": short_name,
                            "formatted": display_name,
                            "lat": lat,
                            "lng": lng
                        }
                        cache_entry = GeocodeCache(query_key=cache_key, result_json=result)
                        db.add(cache_entry)
                        db.commit()
                        return GeocodeSuggestion(**result)
        except Exception:
            pass

    # Fallback if external service fails or is slow
    fallback = {
        "name": f"Location ({round(lat, 4)}, {round(lng, 4)})",
        "formatted": f"Latitude: {round(lat, 4)}, Longitude: {round(lng, 4)}",
        "lat": lat,
        "lng": lng
    }
    return GeocodeSuggestion(**fallback)
