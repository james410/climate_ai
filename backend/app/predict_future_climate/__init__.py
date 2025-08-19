from flask import Blueprint

bp = Blueprint('predict_future_climate', __name__, template_folder='templates')

from app.predict_future_climate import routes
