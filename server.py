import os
from flask import Flask, request, send_file, jsonify
from werkzeug.utils import secure_filename
from PIL import Image
import zipfile
import io
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB limit

IMAGE_SIZE = 1024  # 1024x1024 image
BYTES_PER_IMAGE = IMAGE_SIZE * IMAGE_SIZE  # 1,048,576 bytes

@app.route('/')
def home():
    return "Picxify File Conversion API is running. Use /convert or /reconstruct endpoints."

def file_to_bits_with_metadata(file_data):
    file_size = len(file_data)
    size_bytes = file_size.to_bytes(8, byteorder='big')  
    full_data = size_bytes + file_data

    bits = []
    for byte in full_data:
        bits.extend([int(bit) for bit in f'{byte:08b}'])
    return bits

def save_bits_as_image(bits_chunk):
    img = Image.new('L', (IMAGE_SIZE, IMAGE_SIZE))
    pixels = img.load()

    bit_index = 0
    for y in range(IMAGE_SIZE):
        for x in range(IMAGE_SIZE):
            byte_bits = bits_chunk[bit_index:bit_index+8]
            if len(byte_bits) < 8:
                byte_bits += [0] * (8 - len(byte_bits))

            byte_val = 0
            for bit in byte_bits:
                byte_val = (byte_val << 1) | bit

            pixels[x, y] = byte_val
            bit_index += 8
            if bit_index >= len(bits_chunk):
                break
        if bit_index >= len(bits_chunk):
            break

    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    return img_byte_arr.getvalue()

def convert_to_images(file_data):
    bits = file_to_bits_with_metadata(file_data)
    bits_per_image = BYTES_PER_IMAGE * 8
    total_images = (len(bits) + bits_per_image - 1) // bits_per_image

    images = []
    for i in range(total_images):
        start = i * bits_per_image
        end = start + bits_per_image
        chunk = bits[start:end]
        image_data = save_bits_as_image(chunk)
        images.append((f"f{i+1}.png", image_data))
    
    return images

@app.route('/convert', methods=['POST'])
def convert_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        file_data = file.read()
        images = convert_to_images(file_data)

        # Create zip file in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for name, data in images:
                zip_file.writestr(name, data)

        zip_buffer.seek(0)
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'{os.path.splitext(file.filename)[0]}_images.zip'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def bits_to_file(bits):
    # First 8 bytes (64 bits) contain the original file size
    size_bits = bits[:64]
    size_bytes = []
    
    for i in range(0, 64, 8):
        byte_bits = size_bits[i:i+8]
        byte_val = 0
        for bit in byte_bits:
            byte_val = (byte_val << 1) | bit
        size_bytes.append(byte_val)
    
    file_size = int.from_bytes(bytes(size_bytes), byteorder='big')
    
    # The remaining bits are the actual file data
    file_bits = bits[64:64 + file_size * 8]
    file_bytes = []
    
    for i in range(0, len(file_bits), 8):
        byte_bits = file_bits[i:i+8]
        byte_val = 0
        for bit in byte_bits:
            byte_val = (byte_val << 1) | bit
        file_bytes.append(byte_val)
    
    return bytes(file_bytes)

def image_to_bits(image_data):
    img = Image.open(io.BytesIO(image_data))
    pixels = img.load()
    bits = []
    
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            byte_val = pixels[x, y]
            bits.extend([(byte_val >> (7 - i)) & 1 for i in range(8)])
    
    return bits

@app.route('/reconstruct', methods=['POST'])
def reconstruct_file():
    if 'images' not in request.files:
        return jsonify({'error': 'No images uploaded'}), 400
    
    image_files = request.files.getlist('images')
    if not image_files or image_files[0].filename == '':
        return jsonify({'error': 'No selected images'}), 400

    try:
        # Sort images numerically (f1.png, f2.png, etc.)
        image_files.sort(key=lambda x: int(''.join(filter(str.isdigit, x.filename)) or 0)
        
        all_bits = []
        for image_file in image_files:
            image_data = image_file.read()
            bits = image_to_bits(image_data)
            all_bits.extend(bits)
        
        file_data = bits_to_file(all_bits)
        
        return send_file(
            io.BytesIO(file_data),
            mimetype='application/octet-stream',
            as_attachment=True,
            download_name='reconstructed_file'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    app.run(debug=True)
