from dotenv import load_dotenv
from pathlib import Path
import gdown
import os

load_dotenv()
FOLDER_ID = os.getenv('FOLDER_ID')
ROOT_DIR = Path(__file__).resolve().parent.parent

OUTPUT_PATH = ROOT_DIR / 'gamified-mst' / 'app' / 'images'
FOLDER_URL = f'https://drive.google.com/drive/folders/{FOLDER_ID}'

gdown.download_folder(url = FOLDER_URL, output = str(OUTPUT_PATH), quiet = False)