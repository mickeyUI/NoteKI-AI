from DB import engine, Base
from Models import User


Base.metadata.create_all(bind=engine)

print("public.users created (or already existed).")