from flask import render_template
from app.predict_climate_variable import bp

@bp.route('/')
def index():
    # 控制变量预测气候的页面
    return "这是气候变量预测页面"
