# start.ps1
# 1) If venv doesn't exist, make it
if (-Not (Test-Path .\venv)) {
    python -m venv venv
}

# 2) Activate the venv
.\venv\Scripts\Activate.ps1

# 3) Upgrade pip & install all deps in one shot
pip install --upgrade pip
pip install -r requirements.txt

# 4) Launch your Flask app
python app.py
