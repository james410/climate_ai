from flask import render_template
from app.climate_class import bp

@bp.route('/')
def index():
    # 介绍热岛效应和气候知识的页面
    return "这是气候课堂页面"
