# start.ps1
# (place this at the root of your VerifyIT project)

# 1) Change into the backend folder
Set-Location -Path "$PSScriptRoot\verifyit-backend"

# 2) Activate the venv in verifyit-backend
.\venv\Scripts\Activate.ps1

# 3) Upgrade pip & install all dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 4) Launch your Flask app
python app.py
