from flask import Flask, request, send_from_directory
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
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)
    
    app.config['SESSION_COOKIE_HTTPONLY'] = True 
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = os.getenv('FLASK_ENV') == 'production'

    db.init_app(app)
    app.register_blueprint(v1_bp)

    @app.route('/static/uploads/<path:filename>')
    def serve_static_uploads(filename):
        clean_name = filename.replace('\\', '/')
        uploads_dir = os.path.join(app.root_path, 'static', 'uploads')
        full_path = os.path.join(uploads_dir, clean_name)
        if os.path.isfile(full_path):
            dir_name = os.path.dirname(full_path)
            base_name = os.path.basename(full_path)
            return send_from_directory(dir_name, base_name)
        
        base_name = os.path.basename(clean_name)
        if os.path.exists(uploads_dir):
            for root, _, files in os.walk(uploads_dir):
                if base_name in files:
                    return send_from_directory(root, base_name)
                    
        return {'error': f'Upload file {clean_name} not found'}, 404

    @app.route('/uploads/<path:filename>')
    def serve_uploads_shortcut(filename):
        return serve_static_uploads(filename)

    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = app.make_default_options_response()
            origin = request.headers.get('Origin')
            if origin:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
            else:
                response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
            response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
            return response

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get('Origin')
        if origin:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        else:
            response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        return response

    return app