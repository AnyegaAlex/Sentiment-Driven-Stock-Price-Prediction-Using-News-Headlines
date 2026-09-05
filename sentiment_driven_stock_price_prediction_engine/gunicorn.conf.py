# gunicorn.conf.py
# Gunicorn configuration for Render free tier (512 MB RAM)

import multiprocessing
import os

# Number of worker processes
workers = 1  # Keep low to avoid memory exhaustion

# Use threaded workers (gthread) for better concurrency with low memory
worker_class = "gthread"

# Threads per worker
threads = 2

# Bind to the port from environment (Render sets PORT)
bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"

# Timeout for requests (long enough for LSTM predictions)
timeout = 120

# Keep-alive timeout
keepalive = 120

# Restart workers after processing this many requests (prevents memory leaks)
max_requests = 500
max_requests_jitter = 50

# Use /dev/shm for temporary files if available (speeds up operations)
worker_tmp_dir = "/dev/shm"

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Preload the application (saves memory but may cause issues with Django)
# preload_app = True  # Uncomment if you want to preload