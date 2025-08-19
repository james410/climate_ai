import os
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    
    # MySQL 配置
    MYSQL_HOST = os.environ.get('MYSQL_HOST') or 'localhost'
    MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE') or 'climate_metadata'
    MYSQL_USER = os.environ.get('MYSQL_USER') or 'climate_user'
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD') or 'climatepw'
    MYSQL_PORT = int(os.environ.get('MYSQL_PORT') or 3306)
    
    # SQLAlchemy 配置 (保持兼容性)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        f'mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
