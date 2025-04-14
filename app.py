from flask import Flask, request, render_template, jsonify, send_from_directory
import cv2
import numpy as np
import os
from werkzeug.utils import secure_filename
from image_segmentation import ImageSegmenter

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        # Secure the filename and save the file
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Read and process the image
        image = cv2.imread(file_path)
        if image is None:
            return jsonify({'error': 'Could not read image file'}), 400
            
        segmenter = ImageSegmenter(image)
        
        # Get histogram analysis
        histogram_analysis = segmenter.get_histogram_analysis()
        
        # Process with both methods
        backtracking_result, thresholds, contrasts, metrics_history = segmenter.backtracking_segmentation(1000)
        otsu_result, otsu_metrics = segmenter.optimized_otsu_segmentation()
        
        # Save results
        base_name = os.path.splitext(filename)[0]
        backtracking_path = f"{base_name}_backtracking.jpg"
        otsu_path = f"{base_name}_otsu.jpg"
        
        cv2.imwrite(os.path.join(app.config['UPLOAD_FOLDER'], backtracking_path), backtracking_result)
        cv2.imwrite(os.path.join(app.config['UPLOAD_FOLDER'], otsu_path), otsu_result)
        
        # Prepare analysis data
        analysis = {
            'original_image': filename,
            'backtracking_image': backtracking_path,
            'otsu_image': otsu_path,
            'histogram_analysis': {
                'mean': histogram_analysis['mean'],
                'std_dev': histogram_analysis['std_dev'],
                'peaks': histogram_analysis['peaks'],
                'valleys': histogram_analysis['valleys'],
                'histogram': histogram_analysis['histogram']
            },
            'backtracking_analysis': {
                'thresholds': thresholds[:10],  # First 10 thresholds
                'contrasts': contrasts[:10],    # First 10 contrasts
                'final_threshold': thresholds[-1] if thresholds else None,
                'best_contrast': max(contrasts) if contrasts else None,
                'metrics_history': metrics_history[:10]  # First 10 metrics
            },
            'otsu_analysis': {
                'metrics': otsu_metrics
            }
        }
        
        return jsonify(analysis)
    
    return jsonify({'error': 'Invalid file type'}), 400

if __name__ == '__main__':
    app.run(debug=True) 