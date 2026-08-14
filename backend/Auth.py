import os
from dotenv import load_dotenv
from supabase import create_client
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

SUPABASE_URL = "https://gotothwfryivmhybasez.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvdG90aHdmcnlpdm1oeWJhc2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTk4MDQsImV4cCI6MjA5NjUzNTgwNH0.2DUc-28j7tX08Vi41MeVmfxu9Fc8n3w5Vl7YBNVM1h0"

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        response = supabase.auth.get_user(token)

        if response.user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        return response.user.id

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )