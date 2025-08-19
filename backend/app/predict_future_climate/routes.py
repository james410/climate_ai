from flask import render_template
from app.predict_future_climate import bp

@bp.route('/')
def index():
    # 预测未来十年气候的页面
    return "这是未来气候预测页面"
