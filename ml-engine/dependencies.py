import os
from fastapi import Header, HTTPException, Depends

ML_INTERNAL_API_KEY = os.getenv("ML_INTERNAL_API_KEY", "")

async def verify_service_key(x_modliq_service_key: str | None = Header(default=None)):
    if not ML_INTERNAL_API_KEY:
        return True
    if x_modliq_service_key != ML_INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True
