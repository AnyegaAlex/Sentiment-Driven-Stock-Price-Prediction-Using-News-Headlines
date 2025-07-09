# gunicorn.conf.py
import multiprocessing

workers = 1  # Reduce workers for memory-constrained environments
worker_class = "gthread"  # Use threads instead of processes
threads = 2  # Threads per worker
bind = "0.0.0.0:8000"
timeout = 120  # Increased timeout
keepalive = 120
max_requests = 500  # Restart workers periodically
max_requests_jitter = 50