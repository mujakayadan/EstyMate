import eventlet
eventlet.monkey_patch()

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_socketio import SocketIO

db = SQLAlchemy()
login_manager = LoginManager()
socketio = SocketIO(async_mode='eventlet')


def create_app():
    app = Flask(__name__)
    app.config.from_object('app.config.Config')

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'login'
    socketio.init_app(app)

    with app.app_context():
        # Import routes and register blueprints
        from app import routes  # Import routes here to avoid circular imports
        routes.init_app(app)
        db.create_all()

    return app
