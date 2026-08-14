from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # checks connection is alive before using it —
                           # prevents "SSL connection has been closed unexpectedly"
                           # errors that happen when Supabase drops idle connections
    pool_size=5,           # small pool because you're ALREADY behind Supabase's
                           # own pooler — don't double-pool aggressively
    max_overflow=10,
    # IMPORTANT: disable SQLAlchemy's own prepared statement caching when
    # using the transaction pooler — PgBouncer in transaction mode doesn't
    # support them, and you'll get cryptic errors otherwise
    connect_args={"prepare_threshold": None} if "6543" in (DATABASE_URL or "") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()