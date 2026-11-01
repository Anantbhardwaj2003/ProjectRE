from flask import Flask, request
import os
from dotenv import load_dotenv
from .extension import db
from datetime import timedelta

from app.api.v1.routes import v1_bp

load_dotenv('app.env')
def create_app():
    app = Flask(__name__)
    
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=10)
    
    # --- Secure Cookie Configurations ---
    app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevents client-side JS from reading cookies (mitigates XSS)
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax' # Mitigates cross-site request forgery (CSRF)
    app.config['SESSION_COOKIE_SECURE'] = True  # Uncomment this in production to require HTTPS for the cookie

    db.init_app(app)
    app.register_blueprint(v1_bp)

    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = app.make_default_options_response()
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
            response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
            return response

    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        return response

    return app