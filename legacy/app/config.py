class Config:
    SECRET_KEY = 'flask_secret_key'
    SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:admin@localhost/esty_mate'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
