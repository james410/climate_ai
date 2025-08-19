from flask import Flask
from config import Config
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager

db = SQLAlchemy()
migrate = Migrate()
login = LoginManager()
login.login_view = 'login.login'


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    login.init_app(app)

    # 注册蓝图
    from app.main import bp as main_bp
    app.register_blueprint(main_bp)

    from app.login import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')

    from app.climate_class import bp as climate_class_bp
    app.register_blueprint(climate_class_bp, url_prefix='/climate_class')

    from app.predict_future_climate import bp as predict_future_climate_bp
    app.register_blueprint(predict_future_climate_bp, url_prefix='/predict_future_climate')

    from app.predict_climate_variable import bp as predict_climate_variable_bp
    app.register_blueprint(predict_climate_variable_bp, url_prefix='/predict_climate_variable')

    return app

from app import models
