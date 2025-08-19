from flask import Blueprint

bp = Blueprint('predict_climate_variable', __name__, template_folder='templates')

from app.predict_climate_variable import routes
