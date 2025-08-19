from flask import Blueprint

bp = Blueprint('climate_class', __name__, template_folder='templates')

from app.climate_class import routes
