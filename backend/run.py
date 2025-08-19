from app import create_app, db
from app.models import User # 确保你有一个 User 模型，或者换成你有的模型

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'User': User}

if __name__ == '__main__':
    app.run(debug=True)